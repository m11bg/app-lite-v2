/**
 * ConversationListContext — Estado da lista de conversas.
 * Gerencia a lista de conversas do usuário com polling a cada 30 segundos.
 * Somente componentes que consomem este context re-renderizam quando a lista muda.
 * Implementa backoff automático ao receber erro 429 (Too Many Requests).
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { chatService } from '@/services/chatService';
import { useAuth } from '@/context/AuthContext';
import type { ConversationListState, ConversationSummary } from '@/types/chat';

/** Intervalo de polling para atualização da lista de conversas. */
const POLLING_INTERVAL = 30_000; // 30 segundos

/** Tempo de espera antes de retomar polling após erro 429 (rate limit). */
const RATE_LIMIT_BACKOFF = 30_000; // 30 segundos

const ConversationListContext = createContext<ConversationListState | undefined>(undefined);

interface ConversationListProviderProps {
  children: ReactNode;
}

/**
 * Provider que gerencia o estado da lista de conversas.
 * Implementa polling automático que pausa quando o app vai para background.
 */
export const ConversationListProvider: React.FC<ConversationListProviderProps> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [state, setState] = useState<ConversationListState>({
    conversations: [],
    totalUnread: 0,
    isLoading: false,
    error: null,
  });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const backoffTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  /**
   * Busca a lista de conversas na API e atualiza o estado.
   * Calcula o totalUnread somando os unreadCount de todas as conversas.
   * Implementa backoff automático ao receber erro 429.
   */
  const fetchConversations = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const data: ConversationSummary[] = await chatService.getConversations();
      if (!isMountedRef.current) return;
      const totalUnread = data.reduce((sum, c) => sum + c.unreadCount, 0);
      setState({ conversations: data, totalUnread, isLoading: false, error: null });
    } catch (error: unknown) {
      if (!isMountedRef.current) return;

      // Detecta erro 429 (Too Many Requests) e aplica backoff
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 429) {
        // Para o polling imediatamente
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        // Agenda retomada do polling após período de backoff
        if (backoffTimeoutRef.current) clearTimeout(backoffTimeoutRef.current);
        backoffTimeoutRef.current = setTimeout(() => {
          backoffTimeoutRef.current = null;
          if (isMountedRef.current && isAuthenticated) {
            void fetchConversations();
            if (!intervalRef.current) {
              intervalRef.current = setInterval(fetchConversations, POLLING_INTERVAL);
            }
          }
        }, RATE_LIMIT_BACKOFF);
        return; // Não atualiza estado de erro para 429 — é transitório
      }

      setState((prev) => ({ ...prev, error: 'Erro ao carregar conversas', isLoading: false }));
    }
  }, [isAuthenticated]);

  /** Inicia o polling periódico. */
  const startPolling = useCallback(() => {
    if (intervalRef.current) return;
    intervalRef.current = setInterval(fetchConversations, POLLING_INTERVAL);
  }, [fetchConversations]);

  /** Para o polling periódico. */
  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Inicia/para polling baseado na autenticação e no estado do app
  useEffect(() => {
    isMountedRef.current = true;

    if (!isAuthenticated) {
      stopPolling();
      setState({ conversations: [], totalUnread: 0, isLoading: false, error: null });
      return;
    }

    // Primeira busca + início do polling
    setState((prev) => ({ ...prev, isLoading: true }));
    void fetchConversations();
    startPolling();

    // Listener para pausar polling quando app vai para background
    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        void fetchConversations();
        startPolling();
      } else {
        stopPolling();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppState);

    return () => {
      isMountedRef.current = false;
      stopPolling();
      if (backoffTimeoutRef.current) {
        clearTimeout(backoffTimeoutRef.current);
        backoffTimeoutRef.current = null;
      }
      subscription.remove();
    };
  }, [isAuthenticated, fetchConversations, startPolling, stopPolling]);

  return (
    <ConversationListContext.Provider value={state}>
      {children}
    </ConversationListContext.Provider>
  );
};

/**
 * Hook para consumir o estado da lista de conversas.
 * @returns Estado atual da lista de conversas (conversations, totalUnread, isLoading, error).
 */
export const useConversationList = (): ConversationListState => {
  const context = useContext(ConversationListContext);
  if (!context) {
    throw new Error('useConversationList deve ser usado dentro de ChatProvider');
  }
  return context;
};


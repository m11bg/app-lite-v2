/**
 * ActiveConversationContext — Estado da conversa aberta.
 * Gerencia as mensagens da conversa ativa com polling a cada 15 segundos.
 * Somente componentes que consomem este context re-renderizam quando as mensagens mudam.
 * Implementa backoff automático ao receber erro 429 (Too Many Requests).
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { chatService } from '@/services/chatService';
import type { ActiveConversationState, Message } from '@/types/chat';

/** Intervalo de polling para mensagens da conversa ativa. */
const MESSAGE_POLLING_INTERVAL = 15_000; // 15 segundos

/** Tempo de espera antes de retomar polling após erro 429 (rate limit). */
const RATE_LIMIT_BACKOFF = 30_000; // 30 segundos

/** Interface com setters exposta internamente ao ChatActionsContext. */
export interface ActiveConversationControls {
  state: ActiveConversationState;
  setConversationId: (id: string | null) => void;
  addOptimisticMessage: (message: Message) => void;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
}

const ActiveConversationContext = createContext<ActiveConversationControls | undefined>(undefined);

interface ActiveConversationProviderProps {
  children: ReactNode;
}

/**
 * Provider que gerencia o estado da conversa ativa (aberta).
 * Implementa polling automático que só roda quando uma conversa está aberta.
 */
export const ActiveConversationProvider: React.FC<ActiveConversationProviderProps> = ({ children }) => {
  const [state, setState] = useState<ActiveConversationState>({
    conversationId: null,
    messages: [],
    isLoading: false,
    hasMore: false,
    error: null,
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const backoffTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);
  const conversationIdRef = useRef<string | null>(null);

  /** Reinicia o polling após backoff de rate limit. */
  const restartPollingAfterBackoff = useCallback(() => {
    const convId = conversationIdRef.current;
    if (!convId || !isMountedRef.current) return;
    if (intervalRef.current) return; // já está rodando

    intervalRef.current = setInterval(() => {
      void fetchMessagesInternal(convId, false);
    }, MESSAGE_POLLING_INTERVAL);
  }, []);

  /**
   * Busca mensagens da conversa ativa.
   * Em polling subsequente, busca apenas mensagens mais recentes.
   * Implementa backoff automático ao receber erro 429.
   */
  const fetchMessagesInternal = useCallback(async (convId: string, isInitial: boolean = false) => {
    try {
      const result = await chatService.getMessages(convId, 30);
      if (!isMountedRef.current || conversationIdRef.current !== convId) return;

      setState((prev) => {
        if (isInitial) {
          return {
            conversationId: convId,
            messages: result.messages,
            isLoading: false,
            hasMore: result.hasMore,
            error: null,
          };
        }

        // Polling: merge novas mensagens sem duplicatas
        const existingIds = new Set(prev.messages.map((m) => m._id));
        const newMessages = result.messages.filter((m) => !existingIds.has(m._id));

        if (newMessages.length === 0) return prev;

        return {
          ...prev,
          messages: [...newMessages, ...prev.messages].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          ),
          hasMore: result.hasMore,
          error: null,
        };
      });
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
          restartPollingAfterBackoff();
        }, RATE_LIMIT_BACKOFF);
        return; // Não atualiza estado de erro para 429 — é transitório
      }

      setState((prev) => ({ ...prev, error: 'Erro ao carregar mensagens', isLoading: false }));
    }
  }, [restartPollingAfterBackoff]);

  /** Define a conversa ativa e inicia o carregamento. */
  const setConversationId = useCallback(
    (id: string | null) => {
      // Limpa polling e backoff anteriores
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (backoffTimeoutRef.current) {
        clearTimeout(backoffTimeoutRef.current);
        backoffTimeoutRef.current = null;
      }

      conversationIdRef.current = id;

      if (!id) {
        setState({
          conversationId: null,
          messages: [],
          isLoading: false,
          hasMore: false,
          error: null,
        });
        return;
      }

      setState({
        conversationId: id,
        messages: [],
        isLoading: true,
        hasMore: false,
        error: null,
      });

      void fetchMessagesInternal(id, true);

      // Inicia polling para novas mensagens
      intervalRef.current = setInterval(() => {
        void fetchMessagesInternal(id, false);
      }, MESSAGE_POLLING_INTERVAL);
    },
    [fetchMessagesInternal],
  );

  /** Adiciona uma mensagem otimista (optimistic UI) ao estado. */
  const addOptimisticMessage = useCallback((message: Message) => {
    setState((prev) => ({
      ...prev,
      messages: [message, ...prev.messages],
    }));
  }, []);

  /** Carrega mais mensagens (paginação). */
  const loadMore = useCallback(async () => {
    const convId = conversationIdRef.current;
    if (!convId) return;

    setState((prev) => {
      if (!prev.hasMore || prev.isLoading) return prev;
      return { ...prev, isLoading: true };
    });

    try {
      const currentMessages = state.messages;
      const lastMessage = currentMessages[currentMessages.length - 1];
      if (!lastMessage) return;

      const result = await chatService.getMessages(convId, 30, lastMessage._id);
      if (!isMountedRef.current || conversationIdRef.current !== convId) return;

      setState((prev) => ({
        ...prev,
        messages: [...prev.messages, ...result.messages],
        hasMore: result.hasMore,
        isLoading: false,
      }));
    } catch {
      if (!isMountedRef.current) return;
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, [state.messages]);

  /** Força refresh da conversa ativa. */
  const refresh = useCallback(async () => {
    const convId = conversationIdRef.current;
    if (!convId) return;
    await fetchMessagesInternal(convId, true);
  }, [fetchMessagesInternal]);

  // Pausa polling quando o app vai para background
  useEffect(() => {
    isMountedRef.current = true;

    const handleAppState = (nextState: AppStateStatus) => {
      const convId = conversationIdRef.current;
      if (!convId) return;

      if (nextState === 'active') {
        void fetchMessagesInternal(convId, false);
        if (!intervalRef.current) {
          intervalRef.current = setInterval(() => {
            void fetchMessagesInternal(convId, false);
          }, MESSAGE_POLLING_INTERVAL);
        }
      } else {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppState);

    return () => {
      isMountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (backoffTimeoutRef.current) {
        clearTimeout(backoffTimeoutRef.current);
        backoffTimeoutRef.current = null;
      }
      subscription.remove();
    };
  }, [fetchMessagesInternal]);

  const value: ActiveConversationControls = {
    state,
    setConversationId,
    addOptimisticMessage,
    loadMore,
    refresh,
  };

  return (
    <ActiveConversationContext.Provider value={value}>
      {children}
    </ActiveConversationContext.Provider>
  );
};

/**
 * Hook para consumir o estado da conversa ativa.
 * @returns Estado e controles da conversa ativa.
 */
export const useActiveConversation = (): ActiveConversationControls => {
  const context = useContext(ActiveConversationContext);
  if (!context) {
    throw new Error('useActiveConversation deve ser usado dentro de ChatProvider');
  }
  return context;
};


/**
 * ChatProvider — Wrapper composto que encapsula os 3 contexts do chat.
 * Montado em App.tsx, acima do RootNavigator.
 *
 * Ordem de nesting:
 * 1. ConversationListProvider — estado da lista
 * 2. ActiveConversationProvider — estado da conversa aberta
 * 3. ChatActionsProvider — ações (depende dos dois acima)
 */

import React, { ReactNode } from 'react';
import { ConversationListProvider } from './ConversationListContext';
import { ActiveConversationProvider } from './ActiveConversationContext';
import { ChatActionsProvider } from './ChatActionsContext';

interface ChatProviderProps {
  children: ReactNode;
}

export const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
  return (
    <ConversationListProvider>
      <ActiveConversationProvider>
        <ChatActionsProvider>
          {children}
        </ChatActionsProvider>
      </ActiveConversationProvider>
    </ConversationListProvider>
  );
};


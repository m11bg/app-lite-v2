/**
 * ConversationListScreen — Tela principal do Chat.
 * Exibe a lista de conversas ativas do usuário com pull-to-refresh.
 * Substitui o antigo ChatScreen (placeholder).
 */

import React, { useCallback } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Text } from 'react-native-paper';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { SafeContainer } from '@/components/common/SafeContainer';
import ConversationListItem from '@/components/chat/ConversationListItem';
import { useConversationList } from '@/context/chat/ConversationListContext';
import { useChatActions } from '@/context/chat/ChatActionsContext';
import { useAuth } from '@/context/AuthContext';
import { colors, spacing } from '@/styles/theme';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ChatStackParamList, ParticipantInfo, ConversationSummary } from '@/types';

type Props = NativeStackScreenProps<ChatStackParamList, 'ChatList'>;

const ConversationListScreen: React.FC<Props> = ({ navigation }) => {
  const { conversations, isLoading, error } = useConversationList();
  const { refreshConversations, openConversation } = useChatActions();
  const { user } = useAuth();

  const currentUserId = user?.id ?? '';

  /** Navega para a tela de detalhe da conversa. */
  const handleConversationPress = useCallback(
    (conversationId: string, participant: ParticipantInfo) => {
      openConversation(conversationId);
      navigation.navigate('ConversationDetail', {
        conversationId,
        participant,
      });
    },
    [navigation, openConversation],
  );

  /** Renderiza um item individual da lista. */
  const renderItem = useCallback(
    ({ item }: { item: ConversationSummary }) => (
      <ConversationListItem
        conversation={item}
        currentUserId={currentUserId}
        onPress={handleConversationPress}
      />
    ),
    [currentUserId, handleConversationPress],
  );

  /** Key extractor para FlatList. */
  const keyExtractor = useCallback((item: ConversationSummary) => item._id, []);

  /** Separador entre itens. */
  const ItemSeparator = useCallback(
    () => <View style={styles.separator} />,
    [],
  );

  /** Componente de estado vazio. */
  const EmptyComponent = useCallback(
    () => (
      <View style={styles.emptyContainer}>
        <Icon name="chat-outline" size={64} color={colors.textSecondary} />
        <Text variant="titleMedium" style={styles.emptyTitle}>
          Nenhuma conversa ainda
        </Text>
        <Text variant="bodyMedium" style={styles.emptySubtitle}>
          Inicie uma conversa visitando o perfil de um prestador de serviço.
        </Text>
      </View>
    ),
    [],
  );

  /** Componente de erro. */
  if (error && conversations.length === 0) {
    return (
      <SafeContainer>
        <View style={styles.emptyContainer}>
          <Icon name="alert-circle-outline" size={64} color={colors.error} />
          <Text variant="titleMedium" style={styles.emptyTitle}>
            Erro ao carregar conversas
          </Text>
          <Text variant="bodyMedium" style={styles.emptySubtitle}>
            {error}
          </Text>
        </View>
      </SafeContainer>
    );
  }

  return (
    <SafeContainer>
      <FlatList
        data={conversations}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ItemSeparatorComponent={ItemSeparator}
        ListEmptyComponent={!isLoading ? EmptyComponent : null}
        contentContainerStyle={
          conversations.length === 0 ? styles.emptyList : undefined
        }
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refreshConversations}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeContainer>
  );
};

const styles = StyleSheet.create({
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: spacing.md + 50 + spacing.sm + 4, // avatar size + margins
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyList: {
    flexGrow: 1,
  },
  emptyTitle: {
    marginTop: spacing.md,
    color: colors.text,
    textAlign: 'center',
  },
  emptySubtitle: {
    marginTop: spacing.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
});

export default ConversationListScreen;


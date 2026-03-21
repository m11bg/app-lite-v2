import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { chatService } from '../chatService';
import type { 
  ConversationSummary, 
  Message, 
  CreateConversationResponse, 
  GetMessagesResponse 
} from '@/types/chat';

const mockConversations: ConversationSummary[] = [
  {
    _id: 'conv_1',
    participants: [
      { _id: 'user_1', nome: 'User One' },
      { _id: 'user_2', nome: 'User Two' },
    ],
    lastMessage: {
      text: 'Hello',
      sender: 'user_1',
      createdAt: new Date().toISOString(),
    },
    unreadCount: 0,
    updatedAt: new Date().toISOString(),
  },
];

const mockMessages: Message[] = [
  {
    _id: 'msg_1',
    conversationId: 'conv_1',
    senderId: 'user_1',
    content: 'Hello',
    type: 'text',
    status: 'read',
    createdAt: new Date().toISOString(),
  },
];

const server = setupServer(
  // getConversations
  http.get('*/api/v1/chat/conversations', () => {
    return HttpResponse.json({
      success: true,
      data: mockConversations,
    });
  }),

  // createConversation
  http.post('*/api/v1/chat/conversations', async ({ request }) => {
    const { recipientId } = (await request.json()) as { recipientId: string };
    return HttpResponse.json({
      success: true,
      data: { conversationId: `new_conv_${recipientId}` } as CreateConversationResponse,
    });
  }),

  // getMessages
  http.get('*/api/v1/chat/conversations/:conversationId/messages', ({ params, request }) => {
    const { conversationId } = params;
    const url = new URL(request.url);
    const limit = url.searchParams.get('limit');
    const before = url.searchParams.get('before');

    return HttpResponse.json({
      success: true,
      data: {
        messages: mockMessages.map(m => ({ ...m, conversationId })),
        hasMore: false,
      } as GetMessagesResponse,
    });
  }),

  // sendMessage
  http.post('*/api/v1/chat/conversations/:conversationId/messages', async ({ params, request }) => {
    const { conversationId } = params;
    const { content, type } = (await request.json()) as { content: string; type: string };
    
    const newMessage: Message = {
      _id: 'msg_new',
      conversationId: conversationId as string,
      senderId: 'user_me',
      content,
      type: type as any,
      status: 'sent',
      createdAt: new Date().toISOString(),
    };

    return HttpResponse.json({
      success: true,
      data: newMessage,
    });
  }),

  // markAsRead
  http.patch('*/api/v1/chat/conversations/:conversationId/read', ({ params }) => {
    return HttpResponse.json({
      success: true,
      data: null,
    });
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('chatService', () => {
  it('getConversations deve retornar a lista de conversas', async () => {
    const conversations = await chatService.getConversations();
    expect(conversations).toHaveLength(1);
    expect(conversations[0]._id).toBe('conv_1');
    expect(conversations[0].participants).toHaveLength(2);
  });

  it('createConversation deve retornar o ID da nova conversa', async () => {
    const recipientId = 'user_99';
    const result = await chatService.createConversation(recipientId);
    expect(result.conversationId).toBe(`new_conv_${recipientId}`);
  });

  it('getMessages deve retornar mensagens de uma conversa', async () => {
    const conversationId = 'conv_test';
    const result = await chatService.getMessages(conversationId, 10);
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0].conversationId).toBe(conversationId);
    expect(result.hasMore).toBe(false);
  });

  it('sendMessage deve enviar uma nova mensagem', async () => {
    const conversationId = 'conv_test';
    const content = 'Test message';
    const result = await chatService.sendMessage(conversationId, content);
    expect(result.content).toBe(content);
    expect(result.conversationId).toBe(conversationId);
    expect(result._id).toBe('msg_new');
  });

  it('markAsRead deve chamar o endpoint de leitura com sucesso', async () => {
    const conversationId = 'conv_test';
    await expect(chatService.markAsRead(conversationId)).resolves.not.toThrow();
  });

  describe('Cenários de Erro', () => {
    it('getConversations deve lançar erro se a API falhar', async () => {
      server.use(
        http.get('*/api/v1/chat/conversations', () => {
          return new HttpResponse(null, { status: 500 });
        })
      );

      await expect(chatService.getConversations()).rejects.toThrow();
    });

    it('getMessages deve lançar erro se a API falhar', async () => {
      server.use(
        http.get('*/api/v1/chat/conversations/:id/messages', () => {
          return new HttpResponse(null, { status: 500 });
        })
      );

      await expect(chatService.getMessages('error_id')).rejects.toThrow();
    });

    it('sendMessage deve lançar erro se a API falhar', async () => {
      server.use(
        http.post('*/api/v1/chat/conversations/:id/messages', () => {
          return new HttpResponse(null, { status: 500 });
        })
      );

      await expect(chatService.sendMessage('error_id', 'msg')).rejects.toThrow();
    });
  });
});

# Fase 1 — MVP do Chat Interno (Documento Completo)

## App Lite V2 · Abordagem Híbrida Pragmática

**Autor:** Equipe de Arquitetura — App Lite V2  
**Data:** 18 de março de 2026  
**Versão:** 1.0  
**Status:** Recomendação aprovada para implementação

> **Duração estimada:** 2–3 semanas  
> **Objetivo:** Entregar um chat funcional de texto com polling, sem dependência de infraestrutura de tempo real (Socket.io), validando o produto antes de investir em complexidade.

---

## Índice

1. [Visão Geral](#1-visão-geral)
2. [Escopo da Fase 1](#2-escopo-da-fase-1)
3. [O que está FORA do Escopo](#3-o-que-está-fora-do-escopo)
4. [Infraestrutura Já Existente](#4-infraestrutura-já-existente)
5. [O que Precisa Ser Implementado](#5-o-que-precisa-ser-implementado)
6. [Contexto e Problema de Performance](#6-contexto-e-problema-de-performance)
7. [Recomendação: Abordagem Híbrida Pragmática de Contexts](#7-recomendação-abordagem-híbrida-pragmática-de-contexts)
8. [Arquitetura de Contexts Proposta](#8-arquitetura-de-contexts-proposta)
9. [Interfaces TypeScript](#9-interfaces-typescript)
10. [Regra de Ouro — Quem Consome o Quê](#10-regra-de-ouro--quem-consome-o-quê)
11. [Navegação e Fluxo Cross-Tab](#11-navegação-e-fluxo-cross-tab)
12. [Modelos de Dados (Backend)](#12-modelos-de-dados-backend)
13. [Endpoints REST (Backend)](#13-endpoints-rest-backend)
14. [Autenticação e Segurança](#14-autenticação-e-segurança)
15. [Lógica de "Chat com o Próprio Perfil"](#15-lógica-de-chat-com-o-próprio-perfil)
16. [Prós e Contras — Múltiplos Contexts vs Context Único](#16-prós-e-contras--múltiplos-contexts-vs-context-único)
17. [Exemplos de Código](#17-exemplos-de-código)
18. [Estrutura de Arquivos Recomendada](#18-estrutura-de-arquivos-recomendada)
19. [Backlog de Histórias de Usuário](#19-backlog-de-histórias-de-usuário)
20. [Ordem de Implementação Recomendada](#20-ordem-de-implementação-recomendada)
21. [Critérios de Conclusão da Fase 1](#21-critérios-de-conclusão-da-fase-1)
22. [Checklist de Implementação](#22-checklist-de-implementação)
23. [Plano de Migração Futura e Próximas Fases](#23-plano-de-migração-futura-e-próximas-fases)

---

## 1. Visão Geral

A Fase 1 representa o Mínimo Produto Viável (MVP) do Chat Interno no App Lite V2. O foco principal é estabelecer uma comunicação funcional de texto entre os usuários utilizando uma abordagem baseada em polling, evitando a complexidade e os custos iniciais de uma infraestrutura de tempo real (como Socket.io). Com uma duração estimada de 2 a 3 semanas, esta fase visa validar rapidamente a necessidade e o uso do chat, permitindo que os usuários negociem serviços de forma segura e rastreável dentro do aplicativo. Durante esta transição, o contato via WhatsApp permanecerá como uma opção secundária e de fallback, garantindo que a comunicação não seja interrompida.

A arquitetura de estado recomendada para o frontend é a **Abordagem Híbrida Pragmática de Contexts** — que separa o estado do chat em 3 Contexts especializados, otimizando performance sem introduzir bibliotecas novas.

---

## 2. Escopo da Fase 1

| Tarefa | Descrição |
|--------|-----------|
| **Chat somente texto** | O MVP suportará exclusivamente o envio e recebimento de mensagens de texto, simplificando significativamente o escopo e o tempo de desenvolvimento. |
| **UI básica na ChatScreen** | Desenvolvimento de uma interface de usuário funcional que inclui a lista de conversas ativas e a tela de mensagens detalhada, com um composer de texto para envio. |
| **Manter o WhatsApp** | A funcionalidade de contato via WhatsApp será mantida como uma opção secundária, garantindo a continuidade da comunicação durante a implementação e validação do chat interno. |

### Análise de Viabilidade

| Aspecto | Avaliação |
|---------|-----------|
| Modelo de dados (Conversation, Message) | ✅ Bem definido |
| Endpoints REST (CRUD de conversas/mensagens) | ✅ Viável com a stack Express + MongoDB existente |
| Polling como estratégia inicial (sem WebSocket) | ✅ Pragmático para MVP |
| UI básica (lista de conversas + tela de mensagens) | ✅ Alinhado com react-native-paper |
| Autenticação/autorização | ✅ JWT existente cobre o caso |

---

## 3. O que está FORA do Escopo

| Fora do escopo | Fase que resolve |
|----------------|------------------|
| Indicadores de leitura (✓ enviado, ✓✓ lido) | Fase 2 |
| Envio de fotos e vídeos | Fase 3 |
| Moderação automática (filtro de links/telefones) | Fase 3 |
| Fila offline (mensagens enfileiradas sem conexão) | Fase 3 |

---

## 4. Infraestrutura Já Existente

O projeto já possui aproximadamente 90% da infraestrutura necessária para a Fase 1, o que acelera significativamente o desenvolvimento:

- ✅ **MongoDB + Mongoose:** Base de dados e ORM já configurados para persistência dos modelos `Conversation` e `Message`.
- ✅ **JWT Auth:** Sistema de autenticação via JSON Web Tokens já implementado para identificar remetentes e destinatários de mensagens.
- ✅ **Tab "Chat" no `MainTabNavigator.tsx`:** Um placeholder para a tela de chat já existe na navegação principal, pronto para ser substituído pela implementação real.
- ✅ **Deep linking com rota `Chat` configurada no `App.tsx`:** Capacidade de navegar diretamente para o chat através de links externos ou internos.
- ✅ **GridFS configurado:** Sistema de armazenamento de arquivos grandes já disponível, que será utilizado para futuro envio de mídias na Fase 3.
- ✅ **Zod:** Biblioteca de validação de esquemas já integrada, que será usada para validar payloads de mensagens e conversas.
- ✅ **Guard `RequireAuth`:** Middleware de autenticação que protegerá o acesso às funcionalidades do chat, garantindo que apenas usuários logados possam utilizá-lo.
- ✅ **`ProfileHeader.tsx` com `isPublicView`:** O componente de cabeçalho de perfil já possui lógica para exibir diferentes elementos dependendo se o perfil é público ou do próprio usuário, facilitando a inserção do botão de chat.
- ✅ **Rate Limiting com `express-rate-limit`:** Configurado no backend para proteger os endpoints de envio de mensagens contra abusos.
- ✅ **WhatsApp via `Linking.openURL` no `ProfileHeader.tsx`:** A funcionalidade de contato via WhatsApp já está implementada e permanecerá como fallback.

---

## 5. O que Precisa Ser Implementado

### 5.1. Backend

- ❌ **Model `Conversation.ts`:** Criação do modelo Mongoose para representar as conversas, incluindo participantes, última mensagem e contagem de não lidas. Local: `packages/backend/src/models/`.
- ❌ **Model `Message.ts`:** Criação do modelo Mongoose para representar as mensagens individuais, incluindo remetente, conteúdo e status. Local: `packages/backend/src/models/`.
- ❌ **`chatService.ts`:** Implementação da lógica de negócio para o chat, como criação idempotente de conversas, recuperação de mensagens e atualização de status de leitura. Local: `packages/backend/src/services/`.
- ❌ **`chatController.ts`:** Implementação dos controladores que interagem com o `chatService` e processam as requisições HTTP. Local: `packages/backend/src/controllers/`.
- ❌ **`chatRoutes.ts`:** Definição dos 5 endpoints REST para o chat. Local: `packages/backend/src/routes/`.
- ❌ **Registrar `chatRoutes`:** Inclusão das novas rotas no arquivo principal da aplicação Express. Local: `packages/backend/src/app.ts`.

### 5.2. Mobile

- ❌ **`types/chat.ts`:** Definição das interfaces TypeScript (`IConversation`, `IMessage`, `IParticipant`, `MessageStatus`) para tipagem consistente no frontend.
- ❌ **`chatService.ts`:** Implementação do serviço mobile para realizar as chamadas à API REST do chat. Local: `packages/mobile/src/services/`.
- ❌ **`ChatContext.tsx` (3 Contexts especializados):** Criação dos contexts React para gerenciar o estado do chat de forma otimizada. Local: `packages/mobile/src/context/chat/`.
- ❌ **Substituir `ChatScreen.tsx` (placeholder):** A tela `ChatScreen` existente será substituída pela implementação da lista de conversas.
- ❌ **Nova tela `ConversationScreen.tsx`:** Desenvolvimento da tela que exibe as mensagens de uma conversa específica. Local: `packages/mobile/src/screens/chat/`.
- ❌ **Componente `ConversationListItem.tsx`:** Criação do componente para exibir um item individual na lista de conversas. Local: `packages/mobile/src/components/chat/`.
- ❌ **Componente `MessageBubble.tsx`:** Criação do componente para exibir uma bolha de mensagem individual (enviada ou recebida). Local: `packages/mobile/src/components/chat/`.
- ❌ **Componente `MessageComposer.tsx`:** Criação do componente para o campo de texto e botão de envio de mensagens. Local: `packages/mobile/src/components/chat/`.
- ❌ **Hook `useConversations.ts`:** Desenvolvimento de um hook personalizado para gerenciar a lista de conversas, incluindo a lógica de polling a cada 10 segundos.
- ❌ **Hook `useMessages.ts`:** Desenvolvimento de um hook personalizado para gerenciar as mensagens de uma conversa, incluindo a lógica de polling a cada 10 segundos e cleanup no `useEffect`.
- ❌ **Botão "Enviar Mensagem":** Adição do botão de chat no componente `ContactInfo` dentro de `ProfileHeader.tsx`.
- ❌ **Atualizar `ChatStackParamList`:** Inclusão das novas rotas de chat na tipagem de navegação. Local: `packages/mobile/src/types/navigation.ts`.
- ❌ **Atualizar `MainTabNavigator.tsx`:** Ajuste do navegador de abas para incluir o stack de chat corretamente.

---

## 6. Contexto e Problema de Performance

O documento original da Fase 1 do Chat propõe usar um único `ChatContext.tsx` para gerenciar todo o estado do chat (conversas, mensagens, contadores de não-lidas, status de digitação, etc.).

### Problema identificado

A React Context API faz **re-render de todos os consumidores** quando **qualquer valor** do contexto muda. Em um chat com polling a cada 10 segundos, isso significa:

```
Polling atualiza mensagens de uma conversa
  → ChatContext.Provider recebe novo value
    → TODOS os componentes que usam useContext(ChatContext) re-renderizam
      → Lista de conversas re-renderiza (mesmo sem mudança)
      → Badge de contagem re-renderiza (mesmo sem mudança)
      → Tela de conversa atual re-renderiza (correto, mas pode ser otimizado)
```

**Impacto real:** Em um cenário com 20+ conversas e polling ativo, o app pode sofrer jank (quedas de FPS), especialmente em dispositivos Android de entrada.

### Pontos que a abordagem híbrida resolve

| Aspecto | Problema | Solução proposta |
|---------|----------|------------------|
| Estado centralizado em 1 Context | Re-renders desnecessários | Abordagem Híbrida (múltiplos Contexts) |
| Navegação cross-tab | Não detalhada no documento original | Seção 11 deste documento |
| Performance com polling | Todos os consumidores atualizam | Separação State/Actions + `useMemo` |

---

## 7. Recomendação: Abordagem Híbrida Pragmática de Contexts

A recomendação é **separar o estado do chat em 3 Contexts especializados**, seguindo o padrão que o projeto já utiliza com sucesso no `ProfilePreviewContext` (separação State/Actions).

### Por que "Híbrida Pragmática"?

- **Híbrida:** Combina a simplicidade da Context API (já familiar à equipe) com técnicas de otimização que evitam os problemas de performance.
- **Pragmática:** Não introduz bibliotecas novas (Zustand, Redux Toolkit) na Fase 1, reduzindo risco e curva de aprendizado. A migração fica como opção futura, se necessário.

### Os 3 Contexts

```
ChatProvider (wrapper composto)
├── ConversationListContext    → Lista de conversas + contagem de não-lidas
├── ActiveConversationContext  → Mensagens da conversa aberta + paginação
└── ChatActionsContext         → Funções: enviar, marcar como lida, criar conversa (ESTÁVEL, nunca muda referência)
```

### Por que esta separação funciona

| Cenário | Context Único (problema) | 3 Contexts (solução) |
|---------|--------------------------|----------------------|
| Polling atualiza mensagens da conversa aberta | ❌ Re-renderiza lista de conversas, badge, e tela de mensagens | ✅ Só `ActiveConversationContext` muda → só a tela de mensagens re-renderiza |
| Nova mensagem chega em conversa não-aberta | ❌ Re-renderiza tudo | ✅ Só `ConversationListContext` muda → só a lista e o badge re-renderizam |
| Usuário envia mensagem | ❌ Re-renderiza tudo (incluindo lista e badge) | ✅ Ação via `ChatActionsContext` (referência estável via `useCallback`) → re-render mínimo |
| Navegar entre abas (Chat ↔ Ofertas) | ❌ Re-monta se context resetar | ✅ Context persiste no nível do `App.tsx`, estado preservado |

---

## 8. Arquitetura de Contexts Proposta

### Árvore de Providers

```
App.tsx
└── AuthProvider                    (existente)
    └── ChatProvider                (NOVO — wrapper composto)
        ├── ConversationListProvider
        ├── ActiveConversationProvider
        └── ChatActionsProvider
            └── ProfilePreviewProvider  (existente)
                └── RootNavigator       (existente)
                    └── MainTabNavigator
                        ├── OfertasStack
                        │   └── PublicProfileScreen (consome ChatActionsContext)
                        ├── ChatStack (NOVO)
                        │   ├── ConversationListScreen (consome ConversationListContext)
                        │   └── ConversationDetailScreen (consome ActiveConversationContext + ChatActionsContext)
                        └── ... (Agenda, Comunidade, Perfil)
```

---

## 9. Interfaces TypeScript

```typescript
// types/chat.ts

/** Status de entrega/leitura de uma mensagem */
type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

/** Uma mensagem individual dentro de uma conversa */
interface Message {
  _id: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: 'text' | 'image' | 'video';
  attachmentUrl?: string;
  status: MessageStatus;
  createdAt: string;
  updatedAt: string;
}

/** Resumo de uma conversa para exibição na lista */
interface ConversationSummary {
  _id: string;
  participants: ParticipantInfo[];
  lastMessage: Pick<Message, 'content' | 'createdAt' | 'senderId'> | null;
  unreadCount: number;
  updatedAt: string;
}

/** Informações básicas de um participante */
interface ParticipantInfo {
  _id: string;
  nome: string;
  avatar?: string;
}

// ---------- Context Interfaces ----------

/** Estado da lista de conversas */
interface ConversationListState {
  conversations: ConversationSummary[];
  totalUnread: number;
  isLoading: boolean;
  error: string | null;
}

/** Estado da conversa ativa (aberta) */
interface ActiveConversationState {
  conversationId: string | null;
  messages: Message[];
  isLoading: boolean;
  hasMore: boolean;  // para paginação
  error: string | null;
}

/** Ações do chat — referências estáveis (useCallback) */
interface ChatActionsContextType {
  sendMessage: (conversationId: string, content: string) => Promise<void>;
  createConversation: (participantId: string) => Promise<string>;
  markAsRead: (conversationId: string) => Promise<void>;
  openConversation: (conversationId: string) => void;
  closeConversation: () => void;
  loadMoreMessages: () => Promise<void>;
  refreshConversations: () => Promise<void>;
}
```

---

## 10. Regra de Ouro — Quem Consome o Quê

| Componente/Tela | ConversationListContext | ActiveConversationContext | ChatActionsContext |
|-----------------|:-----------------------:|:------------------------:|:------------------:|
| `ChatBadge` (ícone da tab) | ✅ (`totalUnread`) | ❌ | ❌ |
| `ConversationListScreen` | ✅ | ❌ | ✅ (`openConversation`) |
| `ConversationDetailScreen` | ❌ | ✅ | ✅ (`sendMessage`, `markAsRead`) |
| `PublicProfileScreen` (botão "Enviar Mensagem") | ❌ | ❌ | ✅ (`createConversation`) |
| `MessageComposer` (input de texto) | ❌ | ❌ | ✅ (`sendMessage`) |
| `MessageBubble` | ❌ | ❌ | ❌ (renderiza com props) |

---

## 11. Navegação e Fluxo Cross-Tab

### 11.1. Tipos de Navegação Atualizados

```typescript
// packages/mobile/src/types/navigation.ts

export type ChatStackParamList = {
  ChatList: undefined;
  ConversationDetail: {
    conversationId: string;
    participant: ParticipantInfo;
    recipientName: string;
  };
};

export type MainTabParamList = {
  Ofertas: NavigatorScreenParams<OfertasStackParamList>;
  Agenda: undefined;
  Chat: NavigatorScreenParams<ChatStackParamList>;  // ← MUDANÇA: era `undefined`
  Comunidade: undefined;
  Perfil: NavigatorScreenParams<ProfileStackParamList>;
};
```

### 11.2. Problema de Navegação Cross-Tab

`PublicProfileScreen` está dentro do `OfertasStack` (tab "Ofertas"). `ConversationDetailScreen` estará no `ChatStack` (tab "Chat"). Navegar entre tabs requer **navegação cross-tab**.

### 11.3. Solução com React Navigation

```typescript
// Dentro de PublicProfileScreen.tsx
// Após criar a conversa via ChatActionsContext:

const handleStartConversation = async () => {
  const conversationId = await createConversation(userId);
  
  // Navegação cross-tab: vai para a tab Chat e depois para a tela de detalhe
  navigation.navigate('Chat', {
    screen: 'ConversationDetail',
    params: {
      conversationId,
      participant: {
        _id: prestador.id,
        nome: prestador.nome,
        avatar: prestador.avatar,
      },
    },
  });
};
```

### 11.4. Fluxo de Navegação Cross-Tab (Sequência)

1. Usuário está em `PublicProfileScreen` (tab Ofertas) e toca em "Enviar Mensagem".
2. `createConversation(userId)` é chamado via `ChatActionsContext`.
3. `ChatActionsContext` faz `POST /api/v1/chat/conversations` para o backend.
4. Backend retorna `{ conversationId }` (cria nova ou retorna existente — idempotência).
5. `PublicProfileScreen` recebe o `conversationId`.
6. `navigation.navigate('Chat', { screen: 'ConversationDetail', params: { conversationId, ... } })` é executado.
7. React Navigation troca para a tab "Chat" e empilha `ConversationDetailScreen`.
8. `ConversationDetailScreen` monta e chama `openConversation(conversationId)` via `ChatActionsContext`.
9. `ActiveConversationContext` carrega as mensagens da conversa.

---

## 12. Modelos de Dados (Backend)

### 12.1. Model `Conversation`

```typescript
// packages/backend/src/models/Conversation.ts
import mongoose, { Document, Schema } from 'mongoose';

interface ILastMessage {
  text: string;
  sender: mongoose.Types.ObjectId;
  createdAt: Date;
}

export interface IConversation extends Document {
  participants: mongoose.Types.ObjectId[]; // Array de IDs dos usuários participantes (exatamente 2)
  lastMessage?: ILastMessage;              // Detalhes da última mensagem para exibição rápida
  unreadCount: Map<string, number>;        // Mapa { userId: count } para mensagens não lidas por participante
  createdAt: Date;
  updatedAt: Date;
}

const ConversationSchema: Schema = new Schema({
  participants: {
    type: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    required: true,
    validate: [
      (val: unknown[]) => val.length === 2,
      'A conversa deve ter exatamente dois participantes.'
    ]
  },
  lastMessage: {
    text: { type: String },
    sender: { type: Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date },
  },
  unreadCount: { type: Map, of: Number, default: {} },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Garante que não há conversas duplicadas entre os mesmos dois usuários
ConversationSchema.index({ participants: 1 }, { unique: true });

export default mongoose.model<IConversation>('Conversation', ConversationSchema);
```

### 12.2. Model `Message`

```typescript
// packages/backend/src/models/Message.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface IMessage extends Document {
  conversationId: mongoose.Types.ObjectId;
  sender: mongoose.Types.ObjectId;
  content: string;
  type: 'text';               // Fase 1: somente texto
  status: 'sent' | 'delivered' | 'read';
  createdAt: Date;
}

const MessageSchema: Schema = new Schema({
  conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true },
  sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true, maxlength: 1000 },
  type: { type: String, enum: ['text'], default: 'text' },
  status: { type: String, enum: ['sent', 'delivered', 'read'], default: 'sent' },
  createdAt: { type: Date, default: Date.now },
});

// Otimiza a busca de mensagens por conversa
MessageSchema.index({ conversationId: 1, createdAt: 1 });

export default mongoose.model<IMessage>('Message', MessageSchema);
```

---

## 13. Endpoints REST (Backend)

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/api/v1/chat/conversations` | Lista todas as conversas do usuário autenticado, ordenadas pela data da última atualização (`updatedAt`) em ordem decrescente. Inclui paginação. |
| `POST` | `/api/v1/chat/conversations` | Cria uma nova conversa (ou retorna existente — idempotência) entre o usuário autenticado e o `recipientId` fornecido. |
| `GET` | `/api/v1/chat/conversations/:id/messages` | Lista as mensagens de uma conversa específica, com paginação (cursor-based ou offset). |
| `POST` | `/api/v1/chat/conversations/:id/messages` | Envia uma nova mensagem para a conversa especificada por `:id`. |
| `PATCH` | `/api/v1/chat/conversations/:id/read` | Marca todas as mensagens da conversa como lidas para o usuário autenticado (zera `unreadCount`). |

---

## 14. Autenticação e Segurança

- **Controle de Acesso:** O botão de chat no `ProfileHeader.tsx` só será visível para usuários autenticados. Se um `Visitante` tentar interagir, será redirecionado para a `LoginScreen` via `RequireAuth` com um mecanismo de `pendingRedirect` para retornar ao perfil após o login.
- **Validação de Participantes:** No backend, todos os endpoints de chat (`/api/v1/chat/conversations/:id/*`) validarão que o `userId` extraído do JWT é um dos participantes da conversa antes de permitir qualquer operação de leitura ou escrita.
- **Rate Limiting:** O endpoint `POST /api/v1/chat/conversations/:id/messages` terá `express-rate-limit` aplicado para prevenir spam e abuso.
- **Validação de Dados:**
  - Para criação de conversa: `recipientId` será validado com Zod para ser um `ObjectId` válido: `{ recipientId: z.string().regex(/^[a-f\d]{24}$/i) }`.
  - Para envio de mensagem: `content` será validado com Zod para ser uma string não vazia e com no máximo 1000 caracteres: `{ content: z.string().min(1).max(1000), type: z.literal('text') }`.

---

## 15. Lógica de "Chat com o Próprio Perfil"

A exibição do botão "Enviar Mensagem" no `ProfileHeader.tsx` será controlada pelo parâmetro `isPublicView`. Quando o usuário estiver visualizando seu próprio perfil, `isPublicView` será `false`, e o botão de chat não será renderizado, evitando a possibilidade de iniciar uma conversa consigo mesmo. Apenas os botões de contato externos (WhatsApp, Ligar) devem permanecer visíveis para o próprio usuário.

---

## 16. Prós e Contras — Múltiplos Contexts vs Context Único

### 16.1. Context Único (`ChatContext`)

| Prós | Contras |
|------|---------|
| ✅ Simples de implementar (1 arquivo) | ❌ **Re-render global** a cada polling (10s) |
| ✅ Um único `useChat()` hook | ❌ Performance degrada com mais conversas |
| ✅ Fácil de entender para devs júnior | ❌ Difícil de otimizar depois (refactor pesado) |
| ✅ Menos boilerplate | ❌ `useMemo` / `React.memo` não resolvem (o Provider value muda) |

### 16.2. Múltiplos Contexts (3 Contexts especializados) — **Recomendado**

| Prós | Contras |
|------|---------|
| ✅ **Re-renders cirúrgicos** — só atualiza quem precisa | ❌ Mais boilerplate (3 arquivos de context ou 1 arquivo maior) |
| ✅ **ChatActionsContext nunca muda referência** → componentes que só usam ações nunca re-renderizam | ❌ Dev precisa saber qual hook usar (`useConversationList` vs `useActiveConversation` vs `useChatActions`) |
| ✅ Alinhado com o padrão do projeto (`ProfilePreviewContext` já separa State/Actions) | ❌ Coordenação entre contexts exige cuidado (shared state via refs) |
| ✅ Polling a cada 10s não impacta componentes que não consomem aquele Context | ❌ Debug um pouco mais complexo (React DevTools mostra 3 providers) |
| ✅ **Facilita migração futura** — cada Context pode virar um slice de Zustand/Redux sem mudar consumidores | ❌ Provider nesting (resolvido pelo ChatProvider wrapper) |
| ✅ Separação de responsabilidades clara (SRP) | |
| ✅ Testes unitários mais isolados | |

### 16.3. Veredicto

Para um **MVP com polling**, a diferença de performance entre 1 e 3 Contexts é **significativa**. O custo de boilerplate adicional é **baixo** (≈50 linhas extras) e paga-se em:
- Menos bugs de performance em produção
- Path de migração limpo para Zustand/Redux
- Padrão consistente com o que já existe no projeto

---

## 17. Exemplos de Código

### 17.1. ChatProvider Composto (wrapper)

```typescript
// context/chat/ChatProvider.tsx

import React, { ReactNode } from 'react';
import { ConversationListProvider } from './ConversationListContext';
import { ActiveConversationProvider } from './ActiveConversationContext';
import { ChatActionsProvider } from './ChatActionsContext';

interface ChatProviderProps {
  children: ReactNode;
}

/**
 * Provider composto que encapsula os 3 contexts do chat.
 * Montado em App.tsx, acima do RootNavigator.
 * O order de nesting importa: Actions depende de ConversationList e ActiveConversation.
 */
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
```

### 17.2. ConversationListContext (estado da lista)

```typescript
// context/chat/ConversationListContext.tsx

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { chatService } from '@/services/chatService';
import { useAuth } from '@/context/AuthContext';

const POLLING_INTERVAL = 10_000; // 10 segundos

interface ConversationListState {
  conversations: ConversationSummary[];
  totalUnread: number;
  isLoading: boolean;
  error: string | null;
}

const ConversationListContext = createContext<ConversationListState | undefined>(undefined);

export const ConversationListProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [state, setState] = useState<ConversationListState>({
    conversations: [],
    totalUnread: 0,
    isLoading: false,
    error: null,
  });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchConversations = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const data = await chatService.getConversations();
      const totalUnread = data.reduce((sum, c) => sum + c.unreadCount, 0);
      setState({ conversations: data, totalUnread, isLoading: false, error: null });
    } catch (err) {
      setState(prev => ({ ...prev, error: 'Erro ao carregar conversas', isLoading: false }));
    }
  }, [isAuthenticated]);

  // Inicia/para polling baseado no estado de autenticação e AppState
  useEffect(() => {
    if (!isAuthenticated) return;

    void fetchConversations();
    intervalRef.current = setInterval(fetchConversations, POLLING_INTERVAL);

    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        void fetchConversations();
        if (!intervalRef.current) {
          intervalRef.current = setInterval(fetchConversations, POLLING_INTERVAL);
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
      if (intervalRef.current) clearInterval(intervalRef.current);
      subscription.remove();
    };
  }, [isAuthenticated, fetchConversations]);

  return (
    <ConversationListContext.Provider value={state}>
      {children}
    </ConversationListContext.Provider>
  );
};

export const useConversationList = (): ConversationListState => {
  const context = useContext(ConversationListContext);
  if (!context) throw new Error('useConversationList deve ser usado dentro de ChatProvider');
  return context;
};
```

### 17.3. ChatActionsContext (ações estáveis)

```typescript
// context/chat/ChatActionsContext.tsx

import React, { createContext, useContext, useCallback, useMemo, ReactNode } from 'react';
import { chatService } from '@/services/chatService';

interface ChatActionsContextType {
  sendMessage: (conversationId: string, content: string) => Promise<void>;
  createConversation: (participantId: string) => Promise<string>;
  markAsRead: (conversationId: string) => Promise<void>;
  openConversation: (conversationId: string) => void;
  closeConversation: () => void;
  loadMoreMessages: () => Promise<void>;
  refreshConversations: () => Promise<void>;
}

const ChatActionsContext = createContext<ChatActionsContextType | undefined>(undefined);

export const ChatActionsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Todas as ações são useCallback com deps estáveis → referência nunca muda
  const sendMessage = useCallback(async (conversationId: string, content: string) => {
    await chatService.sendMessage(conversationId, content);
  }, []);

  const createConversation = useCallback(async (participantId: string): Promise<string> => {
    const conversation = await chatService.createConversation(participantId);
    return conversation._id;
  }, []);

  const markAsRead = useCallback(async (conversationId: string) => {
    await chatService.markAsRead(conversationId);
  }, []);

  // ... demais ações com useCallback

  const value = useMemo<ChatActionsContextType>(() => ({
    sendMessage,
    createConversation,
    markAsRead,
    openConversation: () => {}, // implementação real conecta com ActiveConversationContext
    closeConversation: () => {},
    loadMoreMessages: async () => {},
    refreshConversations: async () => {},
  }), [sendMessage, createConversation, markAsRead]);

  return (
    <ChatActionsContext.Provider value={value}>
      {children}
    </ChatActionsContext.Provider>
  );
};

export const useChatActions = (): ChatActionsContextType => {
  const context = useContext(ChatActionsContext);
  if (!context) throw new Error('useChatActions deve ser usado dentro de ChatProvider');
  return context;
};
```

### 17.4. Uso em PublicProfileScreen (navegação cross-tab)

```typescript
// Dentro de PublicProfileScreen.tsx — Botão "Enviar Mensagem"

import { useChatActions } from '@/context/chat/ChatActionsContext';

const PublicProfileScreen: React.FC<Props> = ({ route, navigation }) => {
  const { userId, prestador } = route.params;
  const { createConversation } = useChatActions();
  const [isSending, setIsSending] = useState(false);

  const handleStartConversation = async () => {
    try {
      setIsSending(true);
      const conversationId = await createConversation(userId);

      // Navegação cross-tab: Ofertas → Chat
      navigation.navigate('Chat', {
        screen: 'ConversationDetail',
        params: {
          conversationId,
          participant: {
            _id: prestador.id,
            nome: prestador.nome,
            avatar: prestador.avatar,
          },
        },
      });
    } catch (error) {
      // Toast de erro
    } finally {
      setIsSending(false);
    }
  };

  return (
    // ... UI existente ...
    <Button
      mode="contained"
      onPress={handleStartConversation}
      loading={isSending}
      icon="chat"
      accessibilityLabel={`Enviar mensagem para ${prestador.nome}`}
    >
      Enviar Mensagem
    </Button>
  );
};
```

---

## 18. Estrutura de Arquivos Recomendada

```
packages/mobile/src/
├── context/
│   ├── AuthContext.tsx                 (existente)
│   ├── ProfilePreviewContext.tsx       (existente)
│   ├── SwiperIndexContext.tsx          (existente)
│   └── chat/                          (NOVO)
│       ├── ChatProvider.tsx            ← wrapper composto
│       ├── ConversationListContext.tsx  ← estado da lista
│       ├── ActiveConversationContext.tsx ← estado da conversa aberta
│       └── ChatActionsContext.tsx       ← ações estáveis
├── components/
│   └── chat/                           (NOVO)
│       ├── ConversationListItem.tsx
│       ├── MessageBubble.tsx
│       └── MessageComposer.tsx
├── screens/
│   └── app/
│       └── Chat/                       (NOVO)
│           ├── ConversationListScreen.tsx
│           └── ConversationDetailScreen.tsx
├── hooks/
│   ├── useConversations.ts             (NOVO)
│   └── useMessages.ts                  (NOVO)
├── services/
│   └── chatService.ts                  (NOVO)
├── types/
│   └── chat.ts                         (NOVO)
└── navigation/
    └── MainTabNavigator.tsx            (ATUALIZAR — ChatStack)

packages/backend/src/
├── models/
│   ├── Conversation.ts                 (NOVO)
│   └── Message.ts                      (NOVO)
├── services/
│   └── chatService.ts                  (NOVO)
├── controllers/
│   └── chatController.ts              (NOVO)
├── routes/
│   └── chatRoutes.ts                  (NOVO)
└── app.ts                             (ATUALIZAR — registrar chatRoutes)
```

---

## 19. Backlog de Histórias de Usuário

| ID | Título | Story Points | Prioridade | Dependências |
|----|--------|:------------:|:----------:|--------------|
| US-201 | Criar Conversa (Backend + Mobile Service) | 5 SP | Alta | — |
| US-202 | Listar Conversas Ativas | 5 SP | Alta | US-201 (em paralelo) |
| US-203 | Enviar e Receber Mensagens de Texto | 8 SP | Alta | US-201 |
| US-204 | Marcar Conversa como Lida | 3 SP | Média | US-202, US-203 |
| US-205 | Botão "Enviar Mensagem" no ProfileHeader | 3 SP | Alta | US-201 |
| US-206 | Navegação Cross-Tab (Ofertas → Chat) | 3 SP | Alta | US-205 |
| US-207 | Polling de Conversas e Mensagens | 5 SP | Alta | US-202, US-203 |
| US-208 | Badge de Não-Lidas na Tab Chat | 2 SP | Média | US-204, US-207 |

---

## 20. Ordem de Implementação Recomendada

### Etapa 1 — Backend First (Dias 1–5)

1. **Criar models `Conversation.ts` e `Message.ts`:** Definir os esquemas e modelos Mongoose.
2. **Criar `chatService.ts`:** Implementar a lógica de negócio para criar/buscar conversas (idempotência), enviar/listar mensagens e marcar como lida.
3. **Criar `chatController.ts`:** Implementar os controladores para cada endpoint, utilizando o `chatService`.
4. **Criar `chatRoutes.ts` e registrar no `app.ts`:** Definir as rotas e integrá-las ao servidor Express.
5. **Escrever testes com Jest + Supertest:** Garantir cobertura mínima de 80% para os novos serviços e rotas.

### Etapa 2 — Tipos e Serviços Mobile (Dias 3–7, em paralelo com Etapa 1)

1. **Criar `types/chat.ts`:** Definir as interfaces TypeScript para os modelos de chat.
2. **Criar `chatService.ts` mobile:** Implementar as funções para interagir com a API REST do chat.
3. **Criar os 3 Contexts do chat:** `ConversationListContext`, `ActiveConversationContext`, `ChatActionsContext` + wrapper `ChatProvider`.

### Etapa 3 — UI e Navegação (Dias 6–12)

1. **Atualizar `ChatStackParamList` em `navigation.ts`:** Adicionar as novas rotas de chat.
2. **Atualizar `MainTabNavigator.tsx`:** Integrar o stack de chat na barra de abas inferior.
3. **Substituir `ChatScreen.tsx` pela lista de conversas:** Implementar a tela principal do chat.
4. **Criar `ConversationDetailScreen.tsx`:** Desenvolver a tela de mensagens de uma conversa específica.
5. **Criar componentes:** `ConversationListItem`, `MessageBubble`, `MessageComposer`.
6. **Criar hooks:** `useConversations` e `useMessages` com a lógica de polling a cada 10 segundos e `useEffect` para limpeza.

### Etapa 4 — Integração no ProfileHeader (Dias 10–14)

1. **Adicionar botão "Enviar Mensagem" no componente `ContactInfo` dentro de `ProfileHeader.tsx`:** Implementar a UI para iniciar o chat.
2. **Implementar navegação para `ConversationDetailScreen` com `conversationId`:** Conectar o botão à lógica de criação/recuperação de conversa e navegação.
3. **Testar fluxo completo:** Validar o caminho do usuário desde o perfil até o envio de mensagens.

### Etapa 5 — Testes e QA (Dias 13–15)

1. **Testes unitários com Jest + RNTL (mobile):** Garantir a qualidade dos componentes e hooks.
2. **Testes de integração com Supertest (backend):** Validar a interação entre os serviços e a API.
3. **Testes manuais em Android e iOS:** Realizar testes de usabilidade e funcionalidade em ambos os sistemas operacionais.
4. **Code Review e ajustes finais:** Revisão do código pela equipe e aplicação de melhorias.

---

## 21. Critérios de Conclusão da Fase 1

A Fase 1 será considerada concluída quando todos os seguintes critérios forem atendidos:

- [ ] Usuário autenticado consegue tocar em "Enviar Mensagem" no perfil de outro usuário.
- [ ] O sistema cria uma nova conversa ou recupera uma conversa existente (comportamento idempotente).
- [ ] O usuário é redirecionado para a tela de conversa com o destinatário.
- [ ] O usuário consegue enviar mensagens de texto (com limite de 1.000 caracteres).
- [ ] As mensagens enviadas aparecem na tela com atualização otimista (optimistic UI) em menos de 300ms.
- [ ] O polling a cada 10 segundos atualiza a lista de mensagens e conversas automaticamente.
- [ ] A lista de conversas exibe um badge numérico para conversas com mensagens não lidas.
- [ ] Abrir uma conversa zera o badge de mensagens não lidas para o usuário.
- [ ] Um `Visitante` não autenticado que tenta iniciar um chat é redirecionado para a tela de login.
- [ ] O botão de chat não é exibido quando o usuário visualiza seu próprio perfil.
- [ ] A opção de contato via WhatsApp permanece disponível e funcional.
- [ ] Cobertura de testes unitários e de integração ≥ 80% nos novos serviços e componentes.
- [ ] Todos os testes de lint e type-check (`pnpm lint` + `tsc --noEmit`) passam sem erros.
- [ ] A funcionalidade foi testada e aprovada em dispositivos Android e iOS.

---

## 22. Checklist de Implementação

### Backend

- [ ] Criar model `Conversation.ts` com schema Mongoose
- [ ] Criar model `Message.ts` com schema Mongoose
- [ ] Criar `chatService.ts` com lógica de negócio
- [ ] Criar `chatController.ts` com controladores REST
- [ ] Criar `chatRoutes.ts` com 5 endpoints
- [ ] Registrar `chatRoutes` no `app.ts`
- [ ] Testes unitários e de integração (≥ 80%)

### Mobile — Tipos e Serviços

- [ ] Criar `types/chat.ts` com interfaces de Message, Conversation, etc.
- [ ] Criar `services/chatService.ts` com chamadas REST

### Mobile — Contexts

- [ ] Criar `context/chat/ConversationListContext.tsx`
- [ ] Criar `context/chat/ActiveConversationContext.tsx`
- [ ] Criar `context/chat/ChatActionsContext.tsx`
- [ ] Criar `context/chat/ChatProvider.tsx` (wrapper composto)
- [ ] Montar `ChatProvider` em `App.tsx`

### Mobile — Navegação

- [ ] Criar `ChatStackNavigator` no `MainTabNavigator.tsx`
- [ ] Atualizar `MainTabParamList` com `ChatStackParamList`
- [ ] Atualizar `types/navigation.ts`

### Mobile — Telas e Componentes

- [ ] Criar `ConversationListScreen.tsx`
- [ ] Criar `ConversationDetailScreen.tsx`
- [ ] Criar `ConversationListItem.tsx`
- [ ] Criar `MessageBubble.tsx`
- [ ] Criar `MessageComposer.tsx`

### Mobile — Hooks

- [ ] Criar `useConversations.ts` com polling
- [ ] Criar `useMessages.ts` com polling

### Mobile — Integração

- [ ] Adicionar botão "Enviar Mensagem" no `PublicProfileScreen` / `ProfileHeader.tsx`
- [ ] Implementar navegação cross-tab (Ofertas → Chat)
- [ ] Testes unitários com Jest + RNTL (≥ 80%)

---

## 23. Plano de Migração Futura e Próximas Fases

### 23.1. Path de Migração Técnica

A abordagem híbrida foi projetada para ser **migração-friendly**:

```
Fase 1 (MVP)           → 3 React Contexts + polling HTTP
Fase 2 (Otimização)    → Substituir polling por WebSocket (Socket.io)
Fase 3 (Escala)        → Migrar Contexts para Zustand ou Redux Toolkit (slices)
```

#### Como a migração funciona

1. **Os hooks públicos permanecem idênticos**: `useConversationList()`, `useActiveConversation()`, `useChatActions()`
2. **Apenas a implementação interna muda** (de Context para Zustand store)
3. **Nenhuma tela precisa ser refatorada** — os componentes continuam consumindo os mesmos hooks

```typescript
// Fase 1 — Context
export const useConversationList = (): ConversationListState => {
  const context = useContext(ConversationListContext);
  if (!context) throw new Error('...');
  return context;
};

// Fase 3 — Zustand (mesma interface, diferente implementação)
export const useConversationList = (): ConversationListState => {
  return useChatStore(state => ({
    conversations: state.conversations,
    totalUnread: state.totalUnread,
    isLoading: state.isLoading,
    error: state.error,
  }));
};
```

### 23.2. Fase 2 — Tempo Real (Semanas 4–6)

Esta fase focará na transição do polling para uma comunicação em tempo real, melhorando a experiência do usuário com atualizações instantâneas e notificações.

| Tarefa | Descrição |
|--------|-----------|
| **Socket.io** | Substituir o polling HTTP por WebSocket para atualizações instantâneas de mensagens e status de conversas. |
| **Push Notifications** | Configuração e envio de notificações push via Expo Notifications (FCM/APNs) para alertar os usuários sobre novas mensagens quando o aplicativo estiver em segundo plano. |
| **Indicadores de leitura** | Implementação de indicadores visuais de status (✓ enviado, ✓✓ lido) para cada mensagem. |

**Dependências da Fase 2 (instalar apenas quando iniciar):**

```bash
pnpm add socket.io --filter backend
pnpm add @types/socket.io -D --filter backend
pnpm add ioredis --filter backend           # Para escalar Socket.io com múltiplos servidores
pnpm add socket.io-client --filter mobile
pnpm add expo-notifications --filter mobile
```

### 23.3. Fase 3 — Maturidade (Semanas 7+)

A fase de maturidade adicionará funcionalidades avançadas para enriquecer a experiência do chat e otimizar a interação entre usuários.

| Tarefa | Descrição |
|--------|-----------|
| **Envio de fotos e vídeos** | Suporte a envio de mídia nas conversas, utilizando GridFS já configurado. |
| **Moderação automática** | Filtro de links e telefones para manter as negociações dentro da plataforma. |
| **Analytics de conversão** | Métricas para rastrear a jornada do usuário desde a mensagem inicial até a contratação de um serviço, incluindo tempo de resposta por prestador. |
| **Fila offline** | Funcionalidade para enfileirar mensagens quando o usuário está sem conexão, enviando-as automaticamente assim que a conexão é restabelecida. |
| **Migração de estado** | Migrar Contexts para Zustand ou Redux Toolkit (slices) para melhor escalabilidade. |

---

> **Arquivos de referência do projeto:**
> - `packages/mobile/src/screens/app/ChatScreen.tsx`
> - `packages/mobile/src/components/profile/ProfileHeader.tsx`
> - `packages/mobile/src/navigation/MainTabNavigator.tsx`
> - `packages/mobile/src/navigation/RootNavigator.tsx`
> - `packages/mobile/src/types/navigation.ts`
> - `packages/mobile/App.tsx`
> - `packages/backend/src/app.ts`
> - `packages/backend/package.json`
> - `packages/mobile/package.json`

---

*Documento unificado gerado como referência completa para a Fase 1 do Chat. Revisões futuras devem atualizar este documento conforme a implementação evolui.*


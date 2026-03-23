# Análise Criteriosa de Habilidades Requeridas — Super App Marketplace v2.0

> **Data da análise:** 23 de Março de 2026  
> **Método:** Inspeção detalhada de cada camada do código-fonte real do projeto  
> **Escopo:** Backend (Express/MongoDB) + Mobile (React Native/Expo) + Infraestrutura (pnpm workspaces)

---

## Introdução

Esta análise foi produzida a partir da leitura e inspeção direta de **todos os arquivos-chave** do repositório `app-lite-v2`, incluindo models, controllers, services, middlewares, validações, hooks, contexts, navegação, testes e configurações. O objetivo é mapear com precisão cirúrgica **cada competência técnica real** que um desenvolvedor precisa dominar para atuar neste projeto — indo além de uma listagem genérica de tecnologias.

---

## 🔴 NÍVEL 1 — HABILIDADES ESSENCIAIS (Bloqueadoras)

> Sem estas competências, o desenvolvedor **não consegue contribuir** com o projeto.

### 1.1 TypeScript Avançado (strict mode habilitado)

O `tsconfig.json` raiz opera em `"strict": true` com target `ES2020`. O código exige domínio real, não superficial:

- **Uniões discriminadas (Discriminated Unions):** O `authValidation.ts` usa `z.discriminatedUnion("tipoPessoa", [pfSchema, pjSchema])` — o dev precisa entender como uniões por tag funcionam em TS e Zod simultaneamente.
- **Extensão de interfaces com Document do Mongoose:** Todo model (`IUser extends Document`, `IOfertaServico extends Document`) exige entender a interseção de tipos do Mongoose com tipos do domínio.
- **Type Guards e assertion functions:** O middleware `auth.ts` faz verificações manuais de tipo: `typeof decoded === 'object' && 'userId' in decoded`.
- **Tipos mapped e utilitários:** Uso de `Record<string, unknown>`, `FilterQuery<IOfertaServico>`, `PipelineStage[]`, e `Map<string, number>` na modelagem.
- **Aliases de caminho (`@/`):** Configurados no `tsconfig.json` e `babel.config.js` — dev precisa saber resolver problemas de alias em tempo de build e em testes.
- **Classes de erro customizadas com `Object.setPrototypeOf`:** `errors.ts` usa pattern de herança correta de Error em TS (`BadRequestError`, `PayloadTooLargeError`).

**Arquivos-chave:**
```
tsconfig.json
packages/backend/src/utils/errors.ts
packages/backend/src/middleware/auth.ts
packages/backend/src/validation/authValidation.ts
packages/mobile/src/types/*.ts
```

---

### 1.2 React & React Native com Hooks (Avançado)

Não basta saber `useState`/`useEffect`. O código exige domínio profundo de:

- **`useCallback` com estabilidade de referência:** O `SwipeOfertasScreen.tsx` usa `useCallback` extensivamente para evitar re-renders do Swiper. O dev precisa entender **por que** a estabilidade de referência é necessária em listas de alta performance.
- **`useRef` para controle de concorrência:** O `useOfertaSwipe.ts` tem **5 `useRef` simultâneos** (`requestIdRef`, `abortControllerRef`, `paginationDebounceRef`, `latestPageRef`, `submittingRef`) — padrão de controle de race conditions que não é trivial.
- **`useMemo` com Animated.Value:** O `OfferSwipeCard.tsx` cria `Animated.Value` dentro de `useMemo` — o dev precisa entender a diferença entre instâncias mutáveis e valores imutáveis em memoização.
- **`memo` (React.memo):** O `OfferSwipeCard` é wrappado com `memo` — entender shallow comparison e quando `memo` realmente previne re-render.
- **Composição de Context com separação de concerns:** O Chat usa **3 contexts separados** (`ConversationListContext`, `ActiveConversationContext`, `ChatActionsContext`) compostos via `ChatProvider.tsx`. O dev precisa entender por que isolar estado de ações em contexts distintos reduz re-renders.

**Arquivos-chave:**
```
packages/mobile/src/hooks/useOfertaSwipe.ts (462 linhas)
packages/mobile/src/components/offers/OfferSwipeCard.tsx (248 linhas)
packages/mobile/src/screens/app/SwipeOfertasScreen.tsx (390 linhas)
packages/mobile/src/context/chat/ChatProvider.tsx
```

---

### 1.3 Node.js + Express (Padrão MVC Rigoroso)

A arquitetura é estritamente `Routes → Middleware → Controller → Service → Model`:

- **Pipeline de middlewares encadeados:** Cada rota passa por `rateLimiter → validate(schema) → authMiddleware → controller`. O dev precisa entender a ordem de execução e como `next()` propaga.
- **Error handling centralizado:** O `app.ts` tem um middleware final de erro que intercepta erros de JSON, CORS, PayloadTooLarge e erros genéricos — precisa entender o signature `(err, req, res, next)`.
- **Padrões assíncronos (`async/await` com try/catch):** TODOS os controllers usam `async` com tratamento granular de erros (ValidationError vs E11000 vs genérico).
- **Trust proxy e segurança:** `app.set('trust proxy', 1)` + Helmet com CSP dinâmico usando nonce criptográfico por requisição (`crypto.randomBytes(16)`).

**Arquivos-chave:**
```
packages/backend/src/app.ts (179 linhas)
packages/backend/src/controllers/authController.ts (590 linhas)
packages/backend/src/middleware/auth.ts (120 linhas)
packages/backend/src/routes/index.ts (71 linhas)
```

---

### 1.4 MongoDB + Mongoose (Avançado)

Não basta saber CRUD básico. O código exige:

- **Aggregation Pipeline complexo:** `ofertaService.ts` constrói pipelines com `$geoNear`, `$lookup`, `$addFields`, `$mergeObjects`, `$project`, `$skip`, `$limit` — precisa entender a ordem dos estágios.
- **Índices compostos e geoespaciais:** `OfertaServico.ts` tem índice `2dsphere` em `localizacao.location` + índice de texto em `titulo` e `descricao`. `UserOfferInteraction` tem índice composto único `{ userId: 1, ofertaId: 1 }`.
- **Operação atômica `findOneAndUpdate` com `upsert`:** `interactionService.ts` usa `upsert: true` com detecção de novidade via comparação `createdAt === updatedAt`.
- **Hooks de ciclo de vida (`pre('save')`):** `User.ts` usa `pre('save')` para hash de senha com bcrypt — precisa entender o `this` context e quando o hook executa.
- **Validadores customizados com `this` context:** `User.ts` usa `function(this: IUser)` nos validadores de CPF/CNPJ condicionais por `tipoPessoa`.
- **Map type do Mongoose:** `Conversation.ts` usa `type: Map, of: Number` para `unreadCount` — tipo não trivial.
- **Desnormalização:** O campo `lastMessage` em `Conversation` é desnormalizado para evitar joins — entender trade-offs.

**Arquivos-chave:**
```
packages/backend/src/models/User.ts (236 linhas)
packages/backend/src/models/OfertaServico.ts (374 linhas)
packages/backend/src/models/Conversation.ts (123 linhas)
packages/backend/src/models/UserOfferInteraction.ts (83 linhas)
packages/backend/src/services/ofertaService.ts (387 linhas)
packages/backend/src/services/interactionService.ts (119 linhas)
```

---

## 🟠 NÍVEL 2 — HABILIDADES IMPORTANTES (Limitantes)

> Sem estas, o dev consegue contribuir mas com **produtividade severamente reduzida** e gerará bugs.

### 2.1 Zod (Validação Avançada — usado em AMBOS os pacotes)

O Zod não é usado superficialmente. É o **guardião de tipos** entre frontend e backend:

- **`superRefine` com `ctx.addIssue`:** Usado em `ofertaValidation.ts` para regras cross-field (precoMin < precoMax, sort=distancia exige lat+lng).
- **`z.discriminatedUnion`:** Registro de PF/PJ com schemas condicionais.
- **`.transform()` para mapeamento de campos:** `registerSchema` transforma `password` → `senha`, `razaoSocial` → `nome`.
- **`z.coerce`:** Conversão automática de query params string para number/boolean (`z.coerce.number()`, `z.coerce.boolean()`).
- **Validação de variáveis de ambiente com Zod:** `emailService.ts` usa `z.object` para validar `process.env`.

**Arquivos-chave:**
```
packages/backend/src/validation/authValidation.ts (155 linhas)
packages/backend/src/validation/ofertaValidation.ts (189 linhas)
packages/backend/src/middleware/validation.ts (41 linhas)
packages/mobile/src/utils/validation.ts (295 linhas)
packages/backend/src/services/emailService.ts
```

---

### 2.2 React Navigation 6.x (Tipagem Completa)

O projeto tem navegação **totalmente tipada** com 6 níveis de profundidade:

- **`NavigatorScreenParams<>` aninhado:** `RootStackParamList → MainTabParamList → OfertasStackParamList`.
- **Guards de autenticação:** `RequireAuth.tsx` é um componente wrapper que intercepta navegação e abre modal de Auth globalmente via `openAuthModal()`.
- **`navigationRef` global:** Navegação imperativa fora de componentes React (`RootNavigation.ts`).
- **Deep linking tipado:** `App.tsx` configura linking com `prefixes`, `screens` e `parse` functions para URLs como `applite://Main/Chat/ConversationDetail/:conversationId`.

**Arquivos-chave:**
```
packages/mobile/src/types/navigation.ts (115 linhas)
packages/mobile/src/navigation/RootNavigator.tsx
packages/mobile/src/navigation/MainTabNavigator.tsx (174 linhas)
packages/mobile/src/navigation/guards/RequireAuth.tsx (33 linhas)
packages/mobile/App.tsx (111 linhas)
```

---

### 2.3 Cloudinary SDK + Multer + Streams

O `uploadService.ts` é um módulo complexo de 375 linhas:

- **Upload via Stream (`bufferToStream`):** Converte `Buffer` do Multer em `Readable` Stream para não carregar o arquivo inteiro na memória.
- **Processamento eager assíncrono para vídeos:** `eager_async: true` com transformações de formato.
- **Transformações automáticas de imagem:** `quality: 'auto'`, `fetch_format: 'auto'`.
- **Gerenciamento de `public_id`:** IDs previsíveis baseados em timestamp + nome sanitizado, organizados por pasta do usuário.

**Arquivos-chave:**
```
packages/backend/src/services/uploadService.ts (375 linhas)
packages/backend/src/controllers/uploadController.ts
packages/backend/src/middleware/ensureStorage.ts
```

---

### 2.4 Arquitetura HTTP Avançada (Caching, CORS, Rate Limiting)

- **ETag + 304 Not Modified:** `ofertaController.ts` calcula ETag via SHA1 e retorna `304` quando o cliente já tem os dados.
- **`Cache-Control` com `stale-while-revalidate`:** Headers de cache para revalidação em background.
- **Rate limiters específicos por rota:** Login (5/15min), Register (3/1h), Password Reset (3/15min), General (100/15min), Chat com rate limiters próprios.
- **CORS dinâmico:** `app.ts` implementa whitelist de origens via `config.CORS_ALLOWED_ORIGINS_SET` com tratamento diferenciado dev/prod.

**Arquivos-chave:**
```
packages/backend/src/controllers/ofertaController.ts (249 linhas)
packages/backend/src/middleware/rateLimiter.ts (81 linhas)
packages/backend/src/app.ts (seção CORS)
```

---

### 2.5 Axios (Configuração Avançada no Mobile)

O `api.ts` (271 linhas) não é um wrapper simples:

- **Autodetecção de IP do backend em dev:** Faz health-check em múltiplas URLs candidatas com cache no AsyncStorage.
- **Interceptors de request/response:** Injeta JWT automaticamente, trata 401 (logout automático).
- **AbortController por requisição:** `useOfertaSwipe.ts` cancela requisições pendentes em paginação.

**Arquivos-chave:**
```
packages/mobile/src/services/api.ts (271 linhas)
packages/mobile/src/hooks/useOfertaSwipe.ts (seção loadOfertas)
```

---

## 🟡 NÍVEL 3 — HABILIDADES DIFERENCIANTES (Produtividade & Qualidade)

> Aumentam significativamente a qualidade das contribuições.

### 3.1 Animações (Reanimated 4 + Gesture Handler)

- **`Animated.timing` com `Animated.sequence`:** `OfferSwipeCard.tsx` implementa flashes de animação para feedback de tap nas áreas de mídia.
- **`useNativeDriver` condicional:** `Platform.OS !== 'web'` — o dev precisa entender que web não suporta native driver.
- **Integração com `rn-swiper-list`:** A biblioteca usa Reanimated internamente — precisa debugar issues de worklets e shared values.
- **Plugin do Babel configurado condicionalmente:** `babel.config.js` exclui `react-native-reanimated/plugin` em web e testes.

**Arquivos-chave:**
```
packages/mobile/src/components/offers/OfferSwipeCard.tsx
packages/mobile/babel.config.js
```

---

### 3.2 React Hook Form + Zod no Mobile

- **`zodResolver`:** Integração entre React Hook Form e Zod para validação no `RegisterScreen.tsx`.
- **`Controller` com formatação dinâmica:** Formatadores de CPF/CNPJ/Telefone aplicados dentro do `Controller` do RHF.
- **`reset()` condicional:** Ao trocar `tipoPessoa`, o formulário é resetado preservando campos compartilhados.
- **Erro do servidor mapeado para campo:** `setError('cnpj', { type: 'server', message })` — retroalimentação de erros da API.

**Arquivos-chave:**
```
packages/mobile/src/screens/auth/RegisterScreen.tsx (520 linhas)
packages/mobile/src/utils/validation.ts
```

---

### 3.3 Padrão de Polling com Backoff

- **`ConversationListContext.tsx`:** Polling a cada 30s com pausa quando `AppState !== 'active'`.
- **Backoff para 429:** Detecta erro 429, para o polling, e agenda retomada após 30s.
- **Cleanup de timers:** `clearInterval` + `clearTimeout` em `useEffect` return.

**Arquivos-chave:**
```
packages/mobile/src/context/chat/ConversationListContext.tsx (154 linhas)
```

---

### 3.4 Testes Automatizados (Jest — Duas Estratégias)

- **Backend — Testes de Integração Reais:** `mongodb-memory-server` + `supertest` para testar rotas HTTP ponta a ponta. Timeout de 60s para startup do MongoMemory.
- **Mobile — Mock Massivo:** `jest.setup.ts` (194 linhas) com mocks de: `TurboModuleRegistry`, `NativeModules`, `Platform`, `AsyncStorage`, `expo-video`, `expo-image`, `safe-area-context`, `Animated`, `expo-updates`, `sentry-expo`. O dev precisa entender o porquê de cada mock.
- **MSW (Mock Service Worker):** Listado como dependência para interceptação de chamadas de API nos testes mobile.
- **Configuração de `transformIgnorePatterns`:** Necessário para que Jest compile módulos ESM do Expo/React Native.

**Arquivos-chave:**
```
packages/backend/jest.config.cjs
packages/backend/jest.setup.ts
packages/backend/src/__tests__/auth.test.ts
packages/mobile/jest.config.js
packages/mobile/jest.setup.ts (194 linhas)
```

---

### 3.5 Gestão de Mídia Cross-Platform

- **Diferenças de MIME entre iOS e Android:** `validation.ts` adiciona `video/quicktime` e `image/heic` apenas em `Platform.OS === 'ios'`.
- **Normalização de tipo:** O hook `useMediaPicker` converte `'image'` → `'image/jpeg'` e `'video'` → `'video/mp4'` para compatibilidade com schema Zod — com dívida técnica documentada no código.
- **BlurHash:** Suporte a placeholder de imagem via `blurhash` — precisa entender o conceito e integração com `expo-image`.
- **Feedback tátil:** `vibrateLight()` com bypass para web.

**Arquivos-chave:**
```
packages/mobile/src/hooks/useMediaPicker.ts (208 linhas)
packages/mobile/src/utils/mediaUrl.ts (63 linhas)
packages/mobile/src/utils/haptics.ts
packages/mobile/src/types/media.ts
```

---

## ⚪ NÍVEL 4 — HABILIDADES DE INFRAESTRUTURA & DevOps

### 4.1 pnpm Workspaces

- **Scripts filtrados:** `pnpm run test --filter mobile`, `pnpm --parallel --stream test`.
- **`packageManager` no package.json:** Pinned em `pnpm@10.9.0`.

### 4.2 Expo (SDK 54)

- **`expo-dev-client`:** Build customizado (não usa Expo Go).
- **EAS Build/Submit:** Configurado via `eas.json`.
- **`expo-secure-store`:** Para armazenamento seguro de credenciais.
- **Deep Linking via `expo-linking`:** Configurado em `App.tsx` com `Linking.createURL('/')`.
- **Expo Image (não Image do RN):** Usa `expo-image` para renderização otimizada.
- **Expo Video:** Usa `expo-video` (não expo-av).

### 4.3 Segurança Aplicada

- **Rotação de JWT:** `jwt.ts` implementa `verifyJwtWithRotation` — tenta `JWT_SECRET` atual, e se falhar, tenta `JWT_SECRET_PREVIOUS`.
- **Validação de segredo em produção:** `config/index.ts` rejeita secrets fracas (< 32 chars), default values, ou ausentes.
- **CSP com nonce dinâmico:** Cada request gera um `crypto.randomBytes(16)` para permitir scripts inline específicos.
- **Bcrypt com hashing automático:** `User.ts` pre-save hook.
- **Campos sensíveis projetados out:** Pipeline de aggregation remove `password`, `senha`, `email`, tokens do prestador.

### 4.4 Observabilidade

- **Winston:** Logger estruturado com níveis, cores, timestamps e metadados JSON.
- **Sentry:** Wrapper resiliente (`utils/sentry.ts`) que tenta `sentry-expo` → `@sentry/react-native` → no-ops. Filtra `AbortError` e `CanceledError`.
- **Logs de auditoria:** `loggerUtils.logAuth()`, `loggerUtils.logRequest()`, `loggerUtils.logDatabase()`.

### 4.5 Qodana

- Análise estática de código da JetBrains configurada com profile `qodana.starter`.

---

## 📊 Matriz Resumo de Competências

| Competência | Nível Real no Projeto | O documento original cobriu? |
|---|---|---|
| TypeScript strict + discriminated unions | **Expert** | ⚠️ Parcial (não mencionou discriminated unions, Object.setPrototypeOf, type guards) |
| MongoDB Aggregation Pipeline | **Avançado** | ⚠️ Superficial (não mencionou $geoNear, $lookup, pipelines) |
| Zod (superRefine, transform, discriminatedUnion) | **Avançado** | ⚠️ Parcial (não mencionou transform, superRefine) |
| React Hooks (useRef para concorrência) | **Avançado** | ❌ Não mencionado |
| Polling com Backoff + AppState | **Intermediário-Avançado** | ❌ Não mencionado |
| Navegação tipada com 6 níveis + Guards | **Avançado** | ⚠️ Parcial |
| Cloudinary Streams + Upload assíncrono | **Intermediário-Avançado** | ⚠️ Parcial (não mencionou streams, eager_async) |
| HTTP Caching (ETag, 304, stale-while-revalidate) | **Intermediário** | ❌ Não mencionado |
| JWT Rotation | **Intermediário** | ❌ Não mencionado |
| CSP com nonce dinâmico | **Intermediário** | ❌ Não mencionado |
| Mocking avançado para Jest RN (194 linhas) | **Avançado** | ⚠️ Superficial |
| AbortController para cancelamento de requests | **Intermediário** | ❌ Não mencionado |
| Axios autodetecção de backend com health-check | **Específico** | ❌ Não mencionado |
| Cross-platform MIME handling (iOS vs Android) | **Específico** | ❌ Não mencionado |
| Context splitting (3 contexts para Chat) | **Avançado** | ⚠️ Superficial |
| BlurHash | **Específico** | ❌ Não mencionado |
| Sentry com fallback resiliente | **Intermediário** | ❌ Não mencionado |
| Deep Linking com Expo | **Intermediário** | ❌ Não mencionado |

---

## 🎯 Perfil Ideal do Desenvolvedor

Um profissional apto a atuar neste projeto precisa ser um **Desenvolvedor TypeScript Full Stack Sênior** com experiência comprovada em:

1. **React Native com Expo (não Expo Go — dev-client/EAS)** e profundo domínio de performance (memoização, estabilidade de referência, controle de re-renders).
2. **MongoDB com Aggregation Framework** (não apenas Mongoose CRUD) incluindo queries geoespaciais.
3. **Padrões de concorrência em JavaScript** (AbortController, debounce com useRef, race condition prevention, polling com backoff).
4. **Validação de dados com Zod** em nível avançado (transforms, superRefine, discriminated unions) compartilhada entre frontend e backend.
5. **Segurança aplicada** (JWT rotation, CSP, rate limiting granular, validação de secrets em boot).
6. **Ecossistema de testes Jest** para React Native (mock de módulos nativos, TurboModuleRegistry, MSW, mongodb-memory-server).

---

## 📋 Checklist de Avaliação Técnica Sugerido

Para avaliar candidatos a este projeto, sugere-se cobrir os seguintes pontos em entrevista técnica ou teste prático:

| # | Tópico | Pergunta / Desafio |
|---|---|---|
| 1 | TypeScript | Explique como funciona `z.discriminatedUnion` e por que é preferível a um `z.union` simples. |
| 2 | Mongoose | Construa um pipeline de aggregation que faça `$geoNear` + `$lookup` com projeção de campos sensíveis. |
| 3 | React Hooks | Implemente um hook com `useRef` + `AbortController` para cancelar fetch pendente ao disparar novo. |
| 4 | React Navigation | Tipifique um `StackParamList` com 3 níveis de aninhamento e `NavigatorScreenParams`. |
| 5 | Segurança | Descreva o fluxo de rotação de JWT com `JWT_SECRET_PREVIOUS`. |
| 6 | Testes | Configure um test suite Jest para RN que faça mock de `TurboModuleRegistry` e `expo-image`. |
| 7 | Performance | Explique por que `useCallback` com deps incorretas causa re-render em listas virtualizadas. |
| 8 | Polling | Implemente polling com backoff automático ao receber 429, pausando em background. |

---

*Documento gerado por análise automatizada do código-fonte do repositório `app-lite-v2`.*


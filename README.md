# 🚀 Super App Marketplace de Serviços (v2.0)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-v20+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6.svg)](https://www.typescriptlang.org/)
[![React Native](https://img.shields.io/badge/React%20Native-0.81.5-blue.svg)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-54.0.31-black.svg)](https://expo.dev/)
[![pnpm](https://img.shields.io/badge/pnpm-10.9.0-F69220.svg)](https://pnpm.io/)

O **Super App Marketplace de Serviços** é uma plataforma moderna projetada para conectar prestadores de serviços e clientes de forma dinâmica e intuitiva. A versão 2.0 introduz o inovador **Swipe de Ofertas**, facilitando a descoberta de serviços de maneira rápida e engajadora, inspirada em modelos de sucesso de descoberta rápida.

---

## 📋 Sumário

- [Visão Geral](#-visão-geral)
- [Funcionalidades Principais](#-funcionalidades-principais)
- [Tecnologias Utilizadas](#-tecnologias-utilizadas)
- [Arquitetura](#-arquitetura)
- [Estrutura do Projeto](#-estrutura-do-projeto)
- [Pré-requisitos](#-pré-requisitos)
- [Instalação e Configuração](#-instalação-e-configuração)
- [Variáveis de Ambiente](#-variáveis-de-ambiente)
- [Como Executar](#-como-executar)
- [Scripts Disponíveis](#-scripts-disponíveis)
- [Testes](#-testes)
- [Endpoints da API](#-endpoints-da-api)
- [Segurança](#-segurança)
- [Qualidade de Código](#-qualidade-de-código)
- [Contribuição](#-contribuição)
- [Licença](#-licença)

---

## ✨ Visão Geral

Este projeto é um **monorepo** gerenciado com `pnpm workspaces` que contém:

| Pacote | Caminho | Descrição |
| :--- | :--- | :--- |
| **Backend** | `packages/backend` | API RESTful (Express + MongoDB) |
| **Mobile** | `packages/mobile` | App multiplataforma (React Native + Expo) |

O objetivo principal é oferecer um ecossistema completo para marketplace de serviços, com foco em **usabilidade**, **performance** e **escalabilidade**, suportando as plataformas **Web**, **Android** e **iOS**.

---

## 🔥 Funcionalidades Principais

- **📍 Swipe de Ofertas:** Descubra novos serviços deslizando para a direita ou esquerda.
- **💬 Chat em Tempo Real:** Comunicação direta entre prestador e cliente.
- **🛠️ Gestão de Ofertas:** Criação, edição e exclusão de serviços oferecidos.
- **🔍 Busca Avançada:** Filtros por categoria, subcategoria e localização (Estados do Brasil).
- **👤 Perfis Públicos:** Visualize as competências e histórico de prestadores.
- **📸 Upload de Mídia:** Imagens e vídeos via Cloudinary com preview.
- **📅 Agenda:** Organização de serviços e compromissos.
- **🔔 Notificações:** Fique por dentro de novas mensagens e propostas.
- **🔐 Autenticação Segura:** Fluxo completo de login e registro com JWT (access + refresh tokens).
- **📧 E-mails Transacionais:** Confirmação de cadastro e recuperação de senha via SMTP/Resend.

---

## 🛠 Tecnologias Utilizadas

### Mobile (Frontend)

| Tecnologia | Versão | Finalidade |
| :--- | :--- | :--- |
| React Native | 0.81.5 | Framework mobile multiplataforma |
| Expo | 54.0.31 | Toolchain e build service (EAS) |
| TypeScript | 5.9.x | Tipagem estática |
| React Navigation | 6.x | Navegação (Stack, Bottom Tabs, Material Top Tabs) |
| React Hook Form + Zod | 7.x / 3.x | Formulários e validação |
| Axios | 1.x | Cliente HTTP |
| React Native Paper | 5.x | Componentes de UI (Material Design) |
| Reanimated + Gesture Handler | 4.x / 2.x | Animações e gestos |
| Expo Image Picker | 17.x | Seleção de fotos e vídeos |
| Expo Secure Store | 15.x | Armazenamento seguro de tokens |
| MSW | 2.x | Mocking de API em testes |

### Backend (API)

| Tecnologia | Versão | Finalidade |
| :--- | :--- | :--- |
| Node.js | 20+ | Runtime JavaScript |
| Express | 4.x | Framework HTTP |
| MongoDB + Mongoose | 8.x | Banco de dados NoSQL + ODM |
| JWT (jsonwebtoken) | 9.x | Autenticação (access + refresh tokens) |
| Multer + Cloudinary | 2.x / 2.x | Upload e armazenamento de mídia |
| Nodemailer | 7.x | Envio de e-mails transacionais |
| Zod | 3.x | Validação de schemas de dados |
| Winston | 3.x | Logging estruturado |
| Helmet | 7.x | Headers de segurança HTTP |
| express-rate-limit | 7.x | Proteção contra abuso de requisições |
| bcryptjs | 2.x | Hashing de senhas |

### Ferramentas de Desenvolvimento

| Ferramenta | Finalidade |
| :--- | :--- |
| pnpm 10.9 | Gerenciador de pacotes (workspaces) |
| ESLint + Prettier | Linting e formatação de código |
| Jest + Supertest | Testes unitários e de integração |
| mongodb-memory-server | Banco MongoDB in-memory para testes |
| Testing Library (React Native) | Testes de componentes mobile |
| Concurrently | Execução simultânea de pacotes |
| Qodana | Análise estática de código (JetBrains) |
| ts-node-dev | Hot-reload no desenvolvimento backend |

---

## 🏗 Arquitetura

```text
┌──────────────┐       HTTPS/REST       ┌──────────────────┐       ┌───────────┐
│  Mobile App  │  ◄──────────────────►  │  Express API     │  ◄──► │  MongoDB  │
│  (Expo/RN)   │                        │  (Node.js)       │       └───────────┘
└──────────────┘                        │                  │
                                        │  ┌────────────┐  │       ┌────────────┐
                                        │  │  Multer    │──┼──────►│ Cloudinary │
                                        │  └────────────┘  │       └────────────┘
                                        │                  │
                                        │  ┌────────────┐  │       ┌────────────┐
                                        │  │ Nodemailer │──┼──────►│ SMTP/Resend│
                                        │  └────────────┘  │       └────────────┘
                                        └──────────────────┘
```

**Padrões adotados:**
- Componentes funcionais com React Hooks
- Interfaces TypeScript para definição de props (sem `any`)
- Nomenclatura de arquivos: `NomeComponente.tsx`
- Context API para gerenciamento de estado global
- Validação centralizada com Zod (frontend e backend)
- Separação de responsabilidades: `controllers → services → models`

---

## 📂 Estrutura do Projeto

O projeto utiliza uma arquitetura de **Monorepo** com `pnpm workspaces`:

```text
app-lite-v2/
├── packages/
│   ├── backend/                # API RESTful (Express + MongoDB)
│   │   ├── src/
│   │   │   ├── config/           # Configurações e variáveis de ambiente
│   │   │   ├── controllers/      # Lógica de controle das rotas
│   │   │   ├── middleware/       # Auth, rate limiter, validação
│   │   │   ├── models/           # Modelos do Mongoose (User, Oferta, Chat...)
│   │   │   ├── routes/           # Definição de rotas da API
│   │   │   ├── services/         # Regras de negócio e integrações
│   │   │   ├── types/            # Tipos TypeScript compartilhados
│   │   │   ├── utils/            # Utilitários (logger, JWT, errors)
│   │   │   ├── validation/       # Schemas de validação Zod
│   │   │   ├── app.ts            # Configuração do Express
│   │   │   └── server.ts         # Ponto de entrada do servidor
│   │   └── __tests__/            # Testes unitários e de integração
│   │
│   └── mobile/                 # App Mobile (React Native + Expo)
│       ├── src/
│       │   ├── components/       # Componentes reutilizáveis (UI)
│       │   ├── context/          # Contextos React (Auth, Chat, Swiper...)
│       │   ├── hooks/            # Custom hooks (useAuth, useOfertaSwipe...)
│       │   ├── navigation/       # Navegadores (Stack, Tabs, Guards)
│       │   ├── screens/          # Telas da aplicação
│       │   │   ├── app/            # Telas autenticadas
│       │   │   ├── auth/           # Telas de login/registro
│       │   │   └── profile/        # Telas de perfil
│       │   ├── services/         # Integração com a API (Axios)
│       │   ├── state/            # Gerenciamento de estado (session store)
│       │   ├── styles/           # Estilos globais e temas
│       │   ├── types/            # Tipos e interfaces TypeScript
│       │   └── utils/            # Funções utilitárias
│       ├── assets/               # Ícones, splash screen, fontes
│       └── app.json              # Configuração do Expo
│
├── docs/                       # Documentação adicional do projeto
├── package.json                # Scripts globais e dependências compartilhadas
├── pnpm-workspace.yaml         # Configuração do workspace pnpm
├── tsconfig.json               # Configuração TypeScript base
└── qodana.yaml                 # Configuração de análise estática
```

---

## ⚙️ Pré-requisitos

Antes de começar, você precisará ter instalado:

- [Node.js](https://nodejs.org/) v20 ou superior
- [pnpm](https://pnpm.io/) v10+ (`npm install -g pnpm@latest`)
- Instância do **MongoDB** (local ou [MongoDB Atlas](https://www.mongodb.com/atlas))
- (Opcional) [Expo Dev Client](https://docs.expo.dev/develop/development-builds/introduction/) no dispositivo/emulador para testes mobile
- (Opcional) Conta no [Cloudinary](https://cloudinary.com/) para upload de mídia
- (Opcional) Conta no [Resend](https://resend.com/) para envio de e-mails

---

## 🔐 Variáveis de Ambiente

### Backend (`packages/backend/.env`)

Copie o arquivo de exemplo e edite conforme necessário:

```bash
cp packages/backend/.env.example packages/backend/.env
```

| Variável | Obrigatória | Padrão | Descrição |
| :--- | :---: | :--- | :--- |
| `PORT` | Não | `4000` | Porta do servidor HTTP |
| `HOST` | Não | `0.0.0.0` | Host do servidor |
| `NODE_ENV` | Não | `development` | Ambiente de execução |
| `MONGO_URI` | **Sim** | `mongodb://127.0.0.1:27017/super-app` | URI de conexão com o MongoDB |
| `JWT_SECRET` | **Sim (prod)** | `dev-secret-change-me` | Chave secreta para tokens JWT (mín. 32 chars em prod) |
| `REFRESH_JWT_SECRET` | Não | Igual a `JWT_SECRET` | Chave secreta para refresh tokens |
| `CORS_ORIGIN` | Não | `*` | Origens permitidas (separadas por vírgula) |
| `CLOUDINARY_URL` | Não | — | URL de conexão com Cloudinary |
| `SMTP_HOST` | Não | — | Host do servidor SMTP |
| `SMTP_PORT` | Não | — | Porta do servidor SMTP |
| `SMTP_USER` | Não | — | Usuário SMTP |
| `SMTP_PASS` | Não | — | Senha/API Key SMTP |
| `EMAIL_FROM` | Não | — | E-mail remetente |
| `APP_URL` | Não | `https://app-super.digital` | URL pública do app |

### Mobile (`packages/mobile/.env`)

```env
API_URL=http://SEU_IP_LOCAL:4000
```

> **Nota:** Para testes em dispositivo físico, use o IP da sua máquina na rede local (ex: `192.168.x.x`).

---

## 🚀 Instalação e Configuração

1. **Clonar o Repositório:**
   ```bash
   git clone <url-do-repositorio>
   cd app-lite-v2
   ```

2. **Instalar Dependências:**
   ```bash
   pnpm install
   ```

3. **Configurar Variáveis de Ambiente:**
   ```bash
   cp packages/backend/.env.example packages/backend/.env
   # Edite o arquivo .env com suas credenciais
   ```

4. **Verificar se o MongoDB está rodando:**
   ```bash
   # Local
   mongosh --eval "db.runCommand({ ping: 1 })"

   # Ou use o MongoDB Atlas (configure MONGO_URI no .env)
   ```

---

## 🏃 Como Executar

### Iniciar tudo (Backend + Mobile)

```bash
pnpm start
```

### Iniciar individualmente

```bash
# Apenas Backend (hot-reload com ts-node-dev)
pnpm run start:backend

# Apenas Mobile (Expo dev server)
pnpm run start:mobile
```

### Rodar em emuladores

```bash
# Android
pnpm run android

# iOS (somente macOS)
pnpm run ios
```

> **Dica:** O backend inicia por padrão na porta `4000`. Certifique-se de que o `API_URL` no mobile aponta para o endereço correto.

---

## 📜 Scripts Disponíveis

### Raiz (Monorepo)

| Script | Descrição |
| :--- | :--- |
| `pnpm start` | Inicia Backend e Mobile em paralelo |
| `pnpm build` | Gera o build de produção de ambos os pacotes |
| `pnpm test` | Executa os testes em todo o monorepo |
| `pnpm test:backend` | Executa apenas os testes do backend |
| `pnpm test:mobile` | Executa apenas os testes do mobile |
| `pnpm lint` | Executa verificação de linting em todos os pacotes |

### Backend (`packages/backend`)

| Script | Descrição |
| :--- | :--- |
| `pnpm dev` | Inicia servidor com hot-reload (ts-node-dev) |
| `pnpm build` | Compila TypeScript para JavaScript |
| `pnpm test` | Executa testes com Jest |
| `pnpm test:watch` | Testes em modo watch |

### Mobile (`packages/mobile`)

| Script | Descrição |
| :--- | :--- |
| `pnpm start` | Inicia Expo dev server |
| `pnpm web` | Inicia versão web |
| `pnpm test` | Executa testes com cobertura |
| `pnpm type-check` | Verificação de tipos sem compilar |
| `pnpm lint` | Linting do código |

---

## 🧪 Testes

O projeto utiliza **Jest** como framework de testes em ambos os pacotes:

```bash
# Executar todos os testes
pnpm test

# Apenas backend
pnpm test:backend

# Apenas mobile
pnpm test:mobile
```

### Backend
- **Jest** + **Supertest** para testes de integração das rotas
- **mongodb-memory-server** para banco in-memory durante testes
- Cobertura de: autenticação, CRUD de ofertas, permissões, upload, perfil de usuário

### Mobile
- **Jest** + **Testing Library (React Native)** para testes de componentes
- **MSW (Mock Service Worker)** para mock de chamadas à API
- Relatório de cobertura gerado em `packages/mobile/coverage/`

---

## 📡 Endpoints da API

A API segue o padrão RESTful. Principais grupos de rotas:

| Prefixo | Arquivo de Rotas | Descrição |
| :--- | :--- | :--- |
| `/api/auth` | `authRoutes.ts` | Registro, login, refresh token |
| `/api/users` | `userRoutes.ts` | CRUD de perfil de usuário |
| `/api/ofertas` | `ofertaRoutes.ts` | CRUD de ofertas de serviço |
| `/api/interactions` | `interactionRoutes.ts` | Likes, dislikes e interações de swipe |
| `/api/chat` | `chatRoutes.ts` | Conversas e mensagens |
| `/api/upload` | `uploadRoutes.ts` | Upload de imagens e vídeos |

> Para documentação detalhada dos endpoints, consulte os arquivos em `packages/backend/src/routes/`.

---

## 🛡 Segurança

O projeto implementa diversas camadas de segurança:

- **Helmet** — Headers HTTP seguros (XSS, HSTS, Content-Type sniffing)
- **express-rate-limit** — Proteção contra brute-force e abuso
- **CORS** — Origens permitidas configuráveis via variáveis de ambiente
- **bcryptjs** — Hash seguro de senhas (nunca armazenadas em texto plano)
- **JWT com rotação** — Access token + Refresh token; suporte a migração de chave (`JWT_SECRET_PREVIOUS`)
- **Validação rigorosa em produção** — JWT secret ≥ 32 caracteres e não pode usar valores padrão
- **Zod** — Validação de entrada em todas as rotas
- **Expo Secure Store** — Tokens armazenados de forma segura no dispositivo mobile

---

## 📊 Qualidade de Código

- **TypeScript strict mode** habilitado em todo o monorepo
- **ESLint** + **Prettier** para padrões consistentes
- **Qodana** (JetBrains) para análise estática automatizada
- **Cobertura de testes** com relatórios em `coverage/`
- Princípios: componentes funcionais, hooks customizados, interfaces explícitas, zero `any`

---

## 🤝 Contribuição

Contribuições são muito bem-vindas!

1. Faça um **Fork** do projeto
2. Crie uma **Branch** para sua funcionalidade:
   ```bash
   git checkout -b feature/NovaFuncionalidade
   ```
3. Siga os padrões de código (ESLint + Prettier):
   ```bash
   pnpm lint
   ```
4. Escreva testes para novas funcionalidades:
   ```bash
   pnpm test
   ```
5. Faça o **Commit** seguindo [Conventional Commits](https://www.conventionalcommits.org/):
   ```bash
   git commit -m "feat: adiciona nova funcionalidade X"
   ```
6. Faça o **Push** e abra um **Pull Request**:
   ```bash
   git push origin feature/NovaFuncionalidade
   ```

### Padrões de Commit

| Prefixo | Uso |
| :--- | :--- |
| `feat:` | Nova funcionalidade |
| `fix:` | Correção de bug |
| `docs:` | Alteração em documentação |
| `style:` | Formatação (sem alteração de lógica) |
| `refactor:` | Refatoração de código |
| `test:` | Adição ou correção de testes |
| `chore:` | Tarefas de manutenção |

---

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

---

<p align="center">
  Desenvolvido com ❤️ por <strong>Infotech Development</strong>
</p>

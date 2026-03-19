# Documento de Criação de Histórias de Usuário (User Stories)

Este documento serve como guia e template para a criação de Histórias de Usuário (User Stories) para o projeto **App Lite V2**. O objetivo é padronizar a comunicação entre os stakeholders e a equipe de desenvolvimento, garantindo que as funcionalidades entreguem valor real ao usuário final.

---

## 1. Estrutura de uma User Story

Uma boa User Story deve ser concisa e focar no **quem**, **o quê** e **por que**.

### Formato Padrão
> **Como** [persona/tipo de usuário],  
> **Eu quero** [funcionalidade/ação],  
> **Para que** [benefício/valor entregue].

### Personas Identificadas no Projeto
- **Cliente:** Usuário que busca serviços ou ofertas no marketplace.
- **Prestador:** Usuário que anuncia serviços e gerencia suas ofertas.
- **Usuário Autenticado:** Ações comuns a ambos após o login.
- **Visitante:** Usuário não logado explorando o app.

---

## 2. Critérios de Aceite (Acceptance Criteria)

Os critérios de aceite definem as condições que devem ser satisfeitas para que a história seja considerada concluída. Recomendamos o uso do formato **BDD (Behavior Driven Development)** usando a sintaxe Gherkin:

- **Dado (Given):** O contexto inicial ou pré-condição.
- **Quando (When):** A ação realizada pelo usuário.
- **Então (Then):** O resultado esperado ou mudança de estado.

---

## 3. O Método INVEST

Para garantir a qualidade, cada User Story deve seguir o acrônimo **INVEST**:

1.  **I - Independente:** Deve ser possível desenvolvê-la e entregá-la sem depender de outras histórias.
2.  **N - Negociável:** Não é um contrato rígido; detalhes podem ser discutidos durante o desenvolvimento.
3.  **V - Valiosa:** Deve entregar um valor claro para o usuário ou para o negócio.
4.  **E - Estimável:** A equipe deve ser capaz de estimar o esforço (ex: Story Points).
5.  **S - Small (Pena):** Deve ser pequena o suficiente para caber em uma iteração/sprint.
6.  **T - Testável:** Deve ser possível verificar se foi implementada corretamente através dos critérios de aceite.

---

## 4. Definição de Pronto (DoD) e Preparado (DoR)

### Definição de Preparado (Definition of Ready - DoR)
Uma história só entra em desenvolvimento se:
- [ ] Possui título e descrição clara no formato padrão.
- [ ] Critérios de aceite definidos e compreendidos pela equipe.
- [ ] Protótipos/Mockups anexados (se houver alteração de UI).
- [ ] Dependências técnicas identificadas.
- [ ] Estimada pela equipe de desenvolvimento.

### Definição de Pronto (Definition of Done - DoD)
Uma história é considerada "Pronta" quando:
- [ ] Código implementado seguindo os padrões do projeto (Lint pass).
- [ ] Testes unitários e/ou de integração escritos e passando.
- [ ] Funcionalidade validada em ambiente de staging/QA.
- [ ] Documentação técnica atualizada (se necessário).
- [ ] Revisão de código (Code Review) aprovada.

---

## 5. Exemplos Aplicados ao Projeto

### Exemplo 1: Criação de Oferta (Foco no Prestador)
**Título:** Criar nova oferta de serviço  
**Descrição:** Como Prestador, eu quero cadastrar uma nova oferta de serviço com fotos e descrição, para que clientes possam encontrar meu trabalho no marketplace.  
**Critérios de Aceite:**
- **Cenário:** Cadastro com sucesso
    - **Dado** que estou na tela "Criar Oferta".
    - **Quando** preencho o título, descrição, categoria e faço upload de ao menos uma imagem.
    - **E** clico em "Publicar".
    - **Então** o sistema deve salvar a oferta no banco de dados vinculada ao meu perfil.
    - **E** me redirecionar para a lista de minhas ofertas com uma mensagem de sucesso.

### Exemplo 2: Chat Interno (Foco na Comunicação)
**Título:** Enviar mensagem inicial para prestador  
**Descrição:** Como Cliente, eu quero enviar uma mensagem interna para um prestador a partir do perfil dele, para tirar dúvidas sem expor meu WhatsApp imediatamente.  
**Critérios de Aceite:**
- **Cenário:** Iniciar chat pela primeira vez
    - **Dado** que estou visualizando o perfil público de um prestador.
    - **Quando** clico no botão "Enviar Mensagem".
    - **Então** uma nova conversa deve ser criada (se não existir).
    - **E** devo ser levado para a tela de chat com o campo de texto focado.

---

## 6. Template para Novas Histórias (Copie e Cole)

```markdown
# [ID] - [Título Curto e Objetivo]

**Descrição:**
Como [quem],
Eu quero [o quê],
Para que [por que].

**Critérios de Aceite:**
- **Cenário 1:** [Título do cenário]
    - Dado [contexto]
    - Quando [ação]
    - Então [resultado]

**Notas Técnicas:**
- Impacto no Backend: [ex: Novo endpoint em /routes/chat.ts]
- Impacto no Mobile: [ex: Nova screen em /screens/app/]
- Modelos afetados: [ex: Model User]

**Estimativa:** [Story Points]
```

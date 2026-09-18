# VIDA+ 🌿

Assistente digital de vida saudável e emagrecimento consciente. Organiza alimentação,
hidratação, jejum intermitente, exercícios e hábitos diários em um único app — com uma IA
que monta a rotina do dia automaticamente em vez do usuário precisar procurar o que fazer.

Este repositório contém as três partes do produto:

```
vida-plus-app/
├── backend/    API REST (Node.js + Express + TypeScript + Prisma + PostgreSQL)
├── mobile/     App iOS/Android (Expo + React Native + TypeScript)
└── admin/      Painel administrativo web (React + Vite + TypeScript)
```

## Stack e decisões de arquitetura

| Camada | Tecnologia | Por quê |
|---|---|---|
| Mobile | Expo (React Native) + TypeScript | Uma base de código só para iOS e Android, publicável nas duas lojas |
| Navegação mobile | Estado próprio (zustand), sem lib de rotas | Reduz dependências nativas sensíveis a versão; migrar para `expo-router`/`react-navigation` depois é direto se precisar de deep links |
| Backend | Node.js + Express + TypeScript | Simples, rápido de rodar em qualquer host (Render, Railway, Fly.io, EC2...) |
| Banco de dados | PostgreSQL via **Neon** (serverless) | Banco real, gerenciado, com branch/scaling — já provisionado neste projeto |
| ORM | Prisma | Migrations versionadas, tipagem ponta a ponta |
| Autenticação | JWT + bcrypt | Sem dependência de provedor externo; simples de auditar |
| IA | Anthropic Claude (chamada HTTP direta) | Usa `ANTHROPIC_API_KEY`; sem a chave, cai num modo offline com respostas educativas fixas (o app nunca quebra) |
| Admin | React + Vite, sem framework de UI | Leve, só o necessário para operar conteúdo e ver métricas |

## Como rodar cada parte

### 1. Backend

```bash
cd backend
npm install
npx prisma generate
npx prisma migrate dev   # cria as tabelas no banco configurado em DATABASE_URL
npm run seed              # cria usuário admin + receitas + treinos + conquistas de exemplo
npm run dev                # http://localhost:4000
```

Variáveis de ambiente (`backend/.env`, veja `.env.example`):

- `DATABASE_URL` — já configurado neste projeto com um banco **Neon PostgreSQL real**
  (projeto `vida-plus`, região `aws-us-west-2`). Para produção, crie um branch/projeto Neon
  separado do usado em desenvolvimento.
- `JWT_SECRET` — troque por um segredo forte antes de ir para produção.
- `ANTHROPIC_API_KEY` — **já configurada e funcionando**, com uma chave **dedicada ao
  VIDA+** (nome `vida-plus` no Claude Console, criada em 2026-09-14, sem expiração,
  escopo "Espaço de trabalho padrão"), separada da chave usada pelo "Agente de Tráfego" —
  não compartilha consumo/billing com aquele projeto. Gerenciar/revogar em
  https://console.anthropic.com/settings/keys. Sem essa variável, o Assistente cai
  automaticamente num modo offline com respostas educativas pré-definidas (não quebra, só
  fica menos personalizado).
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` — credenciais do usuário administrador criado pelo seed.
  **Troque a senha padrão antes de expor o admin publicamente.**

### 2. App mobile

```bash
cd mobile
npm install
npm run web       # abre no navegador (mais rápido para desenvolver a UI)
npm run android    # abre no emulador/dispositivo Android via Expo Go
npm run ios        # abre no simulador/dispositivo iOS via Expo Go (precisa de macOS)
```

O app aponta para `http://localhost:4000/api` por padrão (`mobile/app.json` → `extra.apiUrl`).
Para testar em um celular físico com Expo Go, troque `localhost` pelo IP da sua máquina na
rede local.

### 3. Painel administrativo

```bash
cd admin
npm install
npm run dev   # http://localhost:5173
```

Login com o e-mail/senha definidos em `ADMIN_EMAIL` / `ADMIN_PASSWORD` do backend.

## O que já está pronto e funcional (testado ponta a ponta)

- **Onboarding completo**: 6 slides → criação de conta → questionário de perfil em etapas →
  tela "Seu plano está pronto" → dashboard.
- **Autenticação real**: registro, login, sessão persistida (SecureStore no nativo,
  AsyncStorage na web), exclusão de conta (LGPD).
- **Dashboard com progresso do dia**: água, refeições, jejum, exercícios, % geral do dia, e
  uma **linha do tempo gerada automaticamente** a partir da rotina cadastrada (horário de
  acordar/dormir) — é a IA "montando o dia" em vez do usuário procurar o que fazer.
- **Alimentação**: cardápio por período (manhã/tarde/noite), biblioteca de receitas com
  filtros, página de receita com ingredientes/preparo/nutrição/alternativas, **lista de
  compras automática** gerada a partir dos ingredientes das receitas adicionadas ao dia.
- **Jejum intermitente**: timer real (iniciar/pausar/retomar/encerrar/cancelar), protocolos
  16:8/14:10/18:6/12:12, conteúdo educativo com avisos de segurança, histórico.
- **Hidratação**: registro rápido, quantidade personalizada, garrafa animada, histórico do
  dia.
- **Movimento**: treinos por nível/categoria, sessão guiada com cronômetro por exercício e
  descanso entre séries, histórico.
- **Chás & Bebidas**: biblioteca com horário recomendado e avisos de segurança (nunca afirma
  efeito emagrecedor direto, como pedido no briefing).
- **Evolução**: streak de dias consecutivos, pontos/nível, conquistas, calendário de
  consistência, gráfico de água dos últimos 7 dias.
- **Assistente VIDA+ (IA)**: chat com histórico persistido, contexto do perfil do usuário,
  guarda-corpos de segurança no prompt (nunca diagnostica, nunca prescreve), fallback
  offline elegante.
- **Assinatura Premium**: paywall com lista de benefícios, fluxo de teste grátis — ponto de
  integração único e isolado (`subscription.routes.ts` / `PaywallScreen.tsx`) pronto para
  trocar pelo SDK do RevenueCat quando houver contas de desenvolvedor Apple/Google.
- **Perfil**: edição de objetivos/peso/meta de água, notificações configuráveis (lembretes
  locais via `expo-notifications`), modo escuro, política de privacidade, exclusão de conta.
- **Painel admin**: métricas (usuários, conversão, retenção, conteúdo mais favoritado), CRUD
  de receitas e treinos, banners, histórico de notificações enviadas.
- **Gamificação real**: pontos por ação, conquistas desbloqueadas automaticamente por
  critérios (streak, contagens), tudo persistido no banco.

## O que precisa de decisões/credenciais suas antes de ir para produção

1. ~~Chave da Anthropic dedicada~~ ✅ feito — chave `vida-plus` própria, sem expiração,
   testada com crédito real. Antes de produção, considere trocá-la por uma chave com
   expiração/rotação (a página de criação avisa: chaves sem expiração são um risco se
   vazarem) e mover para um cofre de segredos em vez do `.env` local.
2. **Contas de desenvolvedor Apple ($99/ano) e Google Play ($25 único)** para publicar nas
   lojas, mais um **EAS Build** (`eas build`) configurado no projeto Expo.
3. **RevenueCat (ou StoreKit/Billing direto)** para processar pagamentos reais de assinatura
   — hoje o endpoint `/api/subscription/subscribe` ativa o Premium manualmente, sem cobrar
   nada; é o ponto certo para plugar o SDK.
4. **Push notifications reais** (Expo Push / FCM / APNs) — hoje as notificações são só
   locais, agendadas no próprio dispositivo. O botão "Enviar notificação" do admin só grava
   histórico; falta o disparo real via `expo-server-sdk`.
5. ~~Banco de produção separado~~ ✅ feito — projeto Neon `vida-plus-prod` (separado do
   `vida-plus` de desenvolvimento), migrations aplicadas e populado com o conteúdo inicial.
   Credenciais em `backend/.env.production` (nunca commitado — está no `.gitignore`).
6. **Revisão jurídica** dos textos de Termos de Uso e Política de Privacidade (os textos
   atuais no app são um ponto de partida, não documentos jurídicos validados).

## Deploy em produção (backend no Render)

O repositório já vem com `render.yaml` na raiz — um Blueprint do Render que cria o serviço
web do backend com um clique, lendo `backend/` como raiz do projeto.

**Passo a passo:**

1. Crie uma conta em https://render.com (dá para entrar direto com GitHub).
2. Suba este repositório para o GitHub (veja a seção de versionamento abaixo — precisa
   disso primeiro, o Render publica a partir de um repositório Git).
3. No painel do Render: **New → Blueprint**, aponte para o repositório. Ele detecta o
   `render.yaml` sozinho e já sugere o serviço `vida-plus-backend`.
4. Quando pedir os valores dos segredos (`sync: false` no blueprint), preencha com os
   valores de `backend/.env.production`:
   - `DATABASE_URL`, `JWT_SECRET`, `ANTHROPIC_API_KEY`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`
5. Deploy. O Render builda (`npm install && prisma generate && tsc`) e sobe
   (`prisma migrate deploy && npm start`) automaticamente. A cada novo `git push`, ele
   reimplanta sozinho.
6. Copie a URL pública que o Render gera (algo como
   `https://vida-plus-backend.onrender.com`) — é ela que entra em `mobile/eas.json`, nos
   campos `API_URL` dos perfis `preview` e `production`, antes de gerar os builds do app.

**Sobre o plano gratuito do Render**: o serviço "dorme" após ~15 minutos sem tráfego e a
primeira requisição depois disso demora alguns segundos para acordar — tranquilo para
testar, mas antes de divulgar o app publicamente vale migrar para o plano pago (a partir de
~US$7/mês) para ficar sempre ativo.

## Versionamento (Git)

O projeto tem um repositório Git local (`git init` já rodado), mas **precisa da sua
identidade configurada antes do primeiro commit** — por segurança, isso não é algo que deve
ser configurado automaticamente por terceiros. Rode uma vez, no seu terminal:

```bash
git config --global user.name "Seu Nome"
git config --global user.email "seu-email@exemplo.com"
```

Depois disso, o primeiro commit e o envio para o GitHub (necessário para o deploy no Render)
podem seguir o fluxo normal.

## Roteiro Fase 2 (funcionalidades avançadas pedidas no briefing)

Estas quatro funcionalidades exigem SDKs nativos, modelos de visão computacional e/ou
integrações que só fazem sentido com contas de desenvolvedor pagas e testes em dispositivo
físico — por isso ficaram fora deste MVP, mas a arquitetura já foi pensada para recebê-las:

- **Leitura de rótulos por câmera** (OCR de tabela nutricional): usar `expo-camera` para
  capturar a foto e enviar para um endpoint novo `/api/ai/scan-label` que chama um modelo
  com visão (Claude com input de imagem) para extrair calorias/macros e sugerir se o
  produto se encaixa nas restrições do usuário.
- **Reconhecimento de alimentos por foto**: mesmo pipeline de câmera, outro endpoint
  (`/api/ai/recognize-meal`) que classifica o prato e sugere um `MealLog` pré-preenchido
  para o usuário confirmar — nunca registra automaticamente sem confirmação.
- **Integração com Apple Health / Google Fit**: `react-native-health` (iOS) e
  `react-native-health-connect` (Android) para importar passos/exercícios/peso e cruzar
  com o `ProgressEntry` e `WorkoutSession` já existentes no schema — a tabela já tem os
  campos certos para receber esses dados sem migração adicional.
- **Personalização crescente por IA**: hoje o Assistente já usa o perfil em cada chamada;
  o próximo passo é guardar um resumo vetorizado do histórico (refeições, treinos,
  respostas do chat) para a IA "lembrar" padrões ao longo do tempo em vez de só olhar os
  últimos 10 turnos de conversa.
- A lista de compras automática e a integração básica de IA **já estão implementadas** —
  não fazem parte deste roteiro, só as quatro acima.

## Estrutura do fluxo de navegação (mobile)

Abas fixas (rodapé): **Início · Alimentação · Jejum · Atividades · Perfil**.
Acesso rápido na Home, na ordem pedida no briefing:
**🥗 Alimentação → 💧 Hidratação → ⏱️ Jejum → 🏃 Movimento → 🍵 Bem-estar → 📊 Evolução**.

## Revisão de segurança e robustez (2026-09-16)

Depois do MVP inicial, rodei uma revisão dedicada (agentes de exploração/análise + um
agente de planejamento) nos três pacotes e corrigi tudo que era um bug real de segurança ou
robustez — não just estilo. Resumo do que foi encontrado e corrigido:

**Backend — segurança (crítico)**
- IDOR em `/fasting/:id/{pause,resume,end,cancel}` e
  `/workouts/sessions/:id/{complete,cancel}`: qualquer usuário autenticado conseguia
  controlar a sessão de jejum/treino de outro usuário só sabendo o id. Corrigido: toda
  mutação agora exige `userId` no `where` (via `updateMany` + checagem de `count`).
- Farming de pontos: chamar `/end` ou `/complete` repetidamente na mesma sessão (mesmo já
  concluída) reaplicava os pontos de gamificação toda vez. Corrigido junto com o item acima
  — a mutação só é aceita se o status atual permitir a transição.
- Corrida no `/fasting/:id/resume`: duas chamadas simultâneas podiam contar o mesmo
  intervalo de pausa duas vezes. Corrigido com transação `Serializable` no Prisma.

**Backend — robustez (médio)**
- Erros do Prisma (registro não encontrado, violação de FK) vazavam como 500 com stack
  trace; agora viram 404/400 limpos.
- Filtros de categoria/nível em `/recipes` e `/workouts` aceitavam qualquer string e
  quebravam com 500 se inválidos; agora validados com zod.
- Consulta de gamificação (`activeDatesSet`) varria o histórico completo do usuário a cada
  log; agora limitada a 90 dias (suficiente para qualquer conquista de streak).

**Mobile — robustez**
- Sem tratamento global de sessão expirada: agora um 401 em qualquer chamada desloga o
  usuário automaticamente em vez de travar a tela.
- Várias telas (Jejum, Água, Assistente, Evolução, Receita, Sessão de treino) podiam ficar
  presas num spinner infinito se a API falhasse; todas agora mostram erro + botão de tentar
  novamente.
- Atualizações otimistas (lista de compras, modo escuro, notificações) não desfaziam a
  mudança visual se a chamada ao servidor falhasse; agora revertem.
- Faltava tratamento do botão físico de voltar no Android dentro da pilha de telas
  (receita, sessão de treino, etc.) — agora volta um nível em vez de fechar o app.
- **Bug à parte, não relacionado à revisão de segurança**: a tela de onboarding (slides)
  renderizava todos os 6 slides sobrepostos no Expo Web, por causa de `Dimensions.get`
  capturado uma única vez no carregamento do módulo. Trocado por `useWindowDimensions()`.

**Admin — robustez**
- Mesmo problema de sessão expirada do mobile, agora corrigido do mesmo jeito.
- Exclusão de receita/treino/banner sem tratamento de erro (falha ficava invisível) —
  corrigido.
- Faltava edição de receitas e treinos (só dava para criar ou excluir) — adicionado botão
  "Editar" que reaproveita o formulário existente.
- Banner não podia ser desativado sem excluir — adicionada rota `PATCH /admin/banners/:id`
  e botão Ativar/Desativar.
- Formulários aceitavam ingrediente/passo/exercício em branco — agora validado (zod exige
  pelo menos 1 item não vazio).

**Achado de infraestrutura**: o compute do Neon suspende automaticamente após alguns
minutos de inatividade (padrão do plano gratuito) e, neste ambiente, a resolução de DNS às
vezes prioriza um endereço IPv6 lento, fazendo a primeira reconexão do Prisma falhar ou
demorar. Corrigido forçando IPv4 primeiro (`dns.setDefaultResultOrder('ipv4first')`) em
`backend/src/lib/prisma.ts` — se o backend ficar muito tempo parado, a primeira requisição
após reiniciar pode levar alguns segundos a mais enquanto o compute "acorda".

## Checklist de revisão (pedido no briefing)

1. ✅ Botões navegam e chamam a API real (testado via navegador com Expo Web).
2. ✅ Toda tela tem caminho de volta (`pop()`/abas) — sem becos sem saída.
3. ✅ Dados são salvos no Postgres (Neon) — confirmado com registro, água, jejum, receitas.
4. ✅ Progresso atualiza automaticamente após cada ação (água, refeição, treino, jejum).
5. ✅ IA responde de verdade (Assistente VIDA+ testado com chamada real à Anthropic,
   personalizada ao perfil do usuário). ⚠️ Push remoto real (além dos lembretes locais já
   funcionando) depende do item 4 da lista de credenciais acima.
6. ✅ Timer de jejum funciona (iniciar/pausar/retomar/encerrar), testado em tempo real.
7. ✅ Registro de água funciona (rápido, personalizado, histórico).
8. ✅ Registro de exercícios funciona (sessão guiada, cronômetro, histórico).
9. ✅ Sistema Premium preparado (paywall, endpoint de assinatura, campo `plan` no usuário);
   falta só o SDK de pagamento real (item 3 acima).
10. ⚠️ Testado via Expo Web (navegador) nesta sessão — funciona em iOS/Android via Expo Go,
    mas recomendo um teste em dispositivo físico antes de publicar, por causa de diferenças
    de teclado, permissões de notificação e safe area entre plataformas.

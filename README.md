# AutoAssist Mobile

Aplicativo mobile do **AutoAssist IA** — um copiloto de carro com IA para o mercado automotivo brasileiro. Feito em **Expo / React Native**, consome a API Flask já existente do projeto (o mesmo backend do site).

> Branch: `feat/react-native`. O site continua na `main`; não faça `git merge` desta branch para a `main`.

---

## 🛠️ Stack

- **Expo SDK 54** + **Expo Router** (navegação por stack manual em `AppShell`)
- **React 19** + **TypeScript**
- **React Context** para autenticação (`src/context/auth.tsx`)
- **fetch** nativo (`src/lib/api.ts`) — sem Axios
- **expo-secure-store** para persistir a sessão
- `expo-image-picker`, `expo-image`, `expo-location`, `expo-clipboard`, `expo-status-bar`
- `expo-av` (gravação de áudio), `expo-file-system` (download do PDF), `expo-sharing` (abrir/compartilhar), `expo-web-browser` (OAuth Google)

A stack existente foi mantida (não foi reescrita para React Navigation / Zustand / TanStack Query) para reduzir risco e reaproveitar o que já funcionava.

---

## 📁 Estrutura

```
mobile/
├── AppShell.tsx              # Navegação: inicia no NOG + drawer lateral (header com logo + sino + badge)
├── app/
│   ├── _layout.tsx           # Provider de auth + Stack raiz (header oculto)
│   └── index.tsx             # Entrada: AuthScreen ou AppShell conforme a sessão
├── components/
│   ├── primitives.tsx        # AppButton, Card, Field, Pill, EmptyState, Loading
│   ├── VehiclePhoto.tsx       # Foto do veículo (câmera/galeria) — reutilizável
│   ├── HealthRing.tsx          # Anel de saúde (score) — reutilizável (Home + Painel)
│   └── nog/                   # Barra de entrada da NOG (UI separada de estado/API)
│       ├── NogInputBar.tsx    # Barra principal (texto + anexos + voz + enviar), KeyboardAvoiding + Safe Area
│       ├── AttachmentButton.tsx
│       ├── AttachmentMenu.tsx # Menu animado: Câmera / Galeria / Documento / Gerar PDF
│       ├── MessageTextInput.tsx
│       ├── VoiceButton.tsx
│       ├── VoiceRecorder.tsx  # Waveform + timer (presentacional)
│       └── SendButton.tsx
├── constants/theme.ts        # Paleta de marca (roxo/azul), espaçamentos, sombras
├── context/auth.tsx          # useAuth(): login, register, 2FA, loginWithGoogle, logout, refreshUser, request
├── lib/
│   ├── api.ts                # apiRequest<T> + ApiError (suporta JSON e FormData)
│   ├── config.ts             # API_BASE_URL (EXPO_PUBLIC_FLASK_URL / EXPO_PUBLIC_API_URL)
│   ├── report.ts             # generateReportPdf() — POST /api/report + download/share
│   ├── storage.ts            # expo-secure-store (sessão)
│   └── types.ts              # Vehicle, User, MaintenanceAlert, MaintenanceRecord, ChatRecord, Conversation...
└── screens/
    ├── HomeScreen.tsx        # Aba Início (copiloto)
    ├── ChatScreen.tsx        # Aba NOG (usa NogInputBar; histórico de conversas por session_id)
    ├── RaioXScreen.tsx       # Raio-X Mecânico (câmera/galeria)
    ├── ModPassportScreen.tsx # Mod Passport (Premium)
    ├── MaintenanceScreen.tsx # Aba Manutenções (Próximas/Atrasadas/Concluídas + lembrete por e-mail)
    ├── ProfileScreen.tsx     # Aba Perfil
    ├── SecurityScreen.tsx    # 2FA (senha secundária) + senha
    └── (sub-telas) Videos, Events, Plans, Notifications, Settings, Feedback, Dashboard, Mechanics, More
```

---

## 🚀 Como rodar (desenvolvimento mobile)

### 1. Backend (API Flask) — roda no WSL a partir do CMD do Windows

O backend escuta em `0.0.0.0:5001`. O WSL está em *mirror mode*, então o IP do WSL e o do Windows host são o mesmo — o celular alcança pelo IP da rede.

```cmd
wsl -e bash -lc "cd /home/julio_cesar/Projetos/AGENTS/AutoAssist/backend && python app.py"
```

Ou entrando no shell WSL primeiro:

```cmd
wsl
cd ~/Projetos/AGENTS/AutoAssist/backend
python app.py
```

> Deixa o terminal aberto. Ele imprime ` * Servidor rodando em http://localhost:5001`.

### 2. Mobile

```bash
cd mobile
npm install        # primeira vez
npm start -- --tunnel
```

> O `--tunnel` usa o serviço de tunnel do Expo. Se falhar com `failed to start tunnel` (queda do ngrok), use `npm start -- --lan` (celular na mesma Wi-Fi) ou simplesmente `npm start`.

### 3. Usar o backend local (em vez do Render)

Por padrão o app usa `https://autoassist-l9lr.onrender.com`. Para apontar para o backend local, crie `mobile/.env.local` (ignorado pelo git):

```env
EXPO_PUBLIC_FLASK_URL=IP LOCAL:5001
```

`IP LOCAL` é o IP da máquina na rede (descubra com `hostname -I` no WSL). O app resolve esse IP **no celular**, então:

- **Celular físico (Expo Go):** use o IP da rede do PC (ex.: `IP LOCAL:5001`).
- **Android emulator:** `http://10.0.2.2:5001`.
- **iOS simulator / web:** `http://localhost:5001`.

O `.env.local` é lido na subida do Expo — reinicie o `npm start` após alterá-lo. Confirme que o backend está acessível pelo celular abrindo `IP LOCAL:5001` no navegador do aparelho.

---

## 🧭 Navegação

`AppShell` abre direto no **NOG (chat)** e usa um **drawer (menu lateral)** como hub de navegação — não há mais bottom bar.

- **Tela inicial:** `ChatScreen` (NOG) — a IA é a porta de entrada do app.
- **Drawer lateral:** aberto pelo botão **☰ menu** no header (ou botão de **voltar** quando há pilha). Lista todas as telas: NOG, Início, Painel, Manutenções, Mecânicos, Raio-X, Mod Passport, Vídeos, Eventos, Planos, Notificações, Perfil, Segurança, Configurações, Feedback e Mais. Cada item navega substituindo a pilha (`nav.goTo`).
- **Responsivo:** em telas largas (≥ 768px, ex.: tablet/paisagem) o drawer vira uma **sidebar fixa** persistente à esquerda e o botão ☰ some; em celular ele é um **overlay deslizante** com backdrop.
- Componente: `src/components/Drawer.tsx` (variante `overlay` animada + variante `persistent`); a lista de itens vive em `AppShell` (`DRAWER_ITEMS`).
- **Sub-telas** (Mod Passport, FIPE, edição, checkout Premium, etc.) são acessadas por `nav.goTo` a partir das telas principais.

O header (presente em todas as telas) traz a **logo da marca** + saudação (à esquerda) e o **sino de notificações** (à direita) com **badge de não lidas** (`/api/notifications/unread-count`), que abre `NotificationsScreen`.

---

## ✨ Funcionalidades

- **Login, cadastro e 2FA** (via `/api/login`, `/api/cadastro`, `/api/auth/2fa/*`).
- **Login com Google (OAuth2.0):** botão "Entrar com Google" em `AuthScreen`; o backend faz o handshake e devolve os tokens via redirect para o scheme do app (`autoassist://oauth`). O `GOOGLE_REDIRECT_URI` permanece o de produção (sem alteração).
- **Esqueci a senha / redefinir:** modos `forgot`/`reset` em `AuthScreen` (`/api/auth/forgot-password`, `/api/auth/reset-password`).
- **Sessão persistida** com `expo-secure-store`, validada no launch — sessão inválida é limpa silenciosamente (sem crash).
- **Início (copiloto):** "capa" apresentável — hero com saudação, **foto grande** do veículo (editável), link para o **Painel**, anel de **saúde** (`HealthRing`), próxima manutenção e ações rápidas. Suporta **multi-veículo**.
- **Painel (`DashboardScreen`):** gerenciador único do carro. Reúne a visão unificada de **todos os veículos** (foto, `HealthRing`, FIPE, itens de saúde, estatísticas de uso e próxima manutenção) **com** o gerenciamento da garagem: adicionar/editar/excluir veículo, foto via `VehiclePhoto`, e acesso ao **Mod Passport**. É a tela "Meu Carro" consolidada.
- **Foto do veículo:** componente `VehiclePhoto` (`câmera/galeria/remover`) reutilizado em **Início** e **Painel**; abre um bottom-sheet (com opção **Cancelar** sempre visível, inclusive com foto) e salva em `POST /api/veiculos/<id>/foto` (base64).
- **NOG (chat):** barra de entrada componentizada (`components/nog/*`) — campo que cresce, **menu de anexos** (câmera/galeria/documento/PDF), **voz** (`expo-av` → `/api/voice`) e **envio circular**; **histórico de conversas** por `session_id` com busca e "nova conversa".
- **Raio-X Mecânico:** câmera/galeria → análise com **severidade** (ALTA/MÉDIA/BAIXA) e *disclaimer* de que não substitui inspeção presencial.
- **Mod Passport (Premium):** registra mods e recalcula o valor FIPE estimado (ajuste conservador, com teto).
- **Meu Carro (no Painel):** gestão da garagem (adicionar/editar/excluir veículo), FIPE inline, saúde, foto e multi-veículo — tudo dentro do Painel.
- **Manutenções:** abas **Próximas / Atrasadas / Concluídas**, registro, resumo de gastos (Premium) e **lembrete por e-mail** (Premium).
- **Mecânicos:** busca de oficinas + **favoritar** (`/api/mechanics/favorites`).
- **Perfil:** conta, **Segurança/2FA** (`SecurityScreen`), notificações (badge de não lidas), Premium (abrir checkout **e verificar** `/api/pay/confirm`), indicação e logout.
- **Relatório em PDF:** gera PDF do histórico da conversa via menu de anexos (`/api/report` + download/share).

---

## 🔌 APIs reutilizadas do backend

Nenhuma lógica de backend foi duplicada — o app consome os endpoints existentes:

| Endpoint | Uso |
| :------- | :-- |
| `/api/login`, `/api/cadastro`, `/api/refresh` | Autenticação + refresh de token |
| `/api/auth/2fa/*` | Verificação em duas etapas (setup/confirm/disable) |
| `/api/auth/forgot-password`, `/api/auth/reset-password` | Recuperação de senha (públicos) |
| `/api/auth/google/login`, `/api/auth/google/callback` | OAuth Google (branch `?mobile=1` devolve tokens via scheme) |
| `/api/chat`, `/api/chat/history`, `/api/chat/conversations` | NOG (texto + imagem base64) + histórico por `session_id` |
| `/api/voice` | Transcrição de áudio (formato detectado automaticamente) |
| `/api/veiculos`, `/api/veiculos/<id>/modificacoes` (POST) | Garagem + Mod Passport |
| `/api/dashboard` | Saúde %, FIPE e stats por veículo |
| `/api/maintenance/history`, `/api/maintenance/alerts` | Histórico e alertas |
| `/api/maintenance/email-settings`, `/api/maintenance/email/send-now` | Lembrete de manutenção por e-mail (Premium) |
| `/api/mechanics/search`, `/api/mechanics/favorites` | Busca de oficinas + favoritos |
| `/api/events/automotive` | Eventos automotivos |
| `/api/notifications/*`, `/api/notifications/unread-count` | Notificações + badge de não lidas |
| `/api/referral` | Link de indicação |
| `/api/pay/preference`, `/api/pay/confirm` | Checkout Premium + confirmação |
| `/api/report` | Geração de relatório em PDF |
| `/api/user` | Dados do usuário logado |

---

## ✅ Verificações

```bash
cd mobile
npx tsc --noEmit     # digitação (requer @types/react-native para passar 100%)

cd ..
python -m compileall backend
```

---

## 📝 Licença e Autoria

Ideia original de **Clara Francisco**.
Desenvolvido por **Júlio César**, **Caio Lima**, **Eduardo Nishida** e **Caio Yugo**.

# AutoAssist IA • Consultor Automotivo Inteligente 🚗🤖

![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)
![Flask](https://img.shields.io/badge/Flask-000000?style=for-the-badge&logo=flask&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-4479A1?style=for-the-badge&logo=mysql&logoColor=white)
![Neura IA](https://img.shields.io/badge/AI_Local-Ollama-blue?style=for-the-badge&logo=openai&logoColor=white)

O **AutoAssist IA** é um ecossistema de inteligência artificial de última geração, desenvolvido especificamente para o mercado automotivo brasileiro. A plataforma integra Processamento de Linguagem Natural (NLP) e Visão Computacional para fornecer diagnósticos precisos, avaliações de mercado e consultoria técnica especializada, operando de forma **100% privada e local** através da integração com a **Neura IA**.

---

## ✨ Funcionalidades

### **Recursos Gratuitos (Trial de 30 dias)**

- **Consultoria Especializada (NOG):** O assistente "NOG" oferece respostas focadas no mercado brasileiro, analisando modelos, versões, manutenção e custo-benefício.
- **Raio-X Mecânico:** Análise detalhada de fotos de veículos para identificar defeitos ocultos (ferrugem, desalinhamentos, vazamentos).
- **Estimativa de Preço:** Comparação do estado do veículo com a tabela FIPE para avaliação de mercado.
- **Visão Computacional:** Pipeline de dois estágios (Moondream + Qwen) para análise visual profunda.

### **Recursos Premium (R$ 29,90)**

- **Acesso Ilimitado:** Sem limite de tempo após o período de teste.
- **Laudos Técnicos em PDF:** Geração de relatórios profissionais com análise completa e dados do usuário.
- **Modo de Voz Bidirecional:** Interação por voz usando Web Speech API (Speech-to-Text + Text-to-Speech).

### **Segurança e Privacidade**

- **Privacidade Total:** Graças ao uso do **Ollama**, nenhum dado ou imagem sai do seu servidor. Todo o processamento é local.
- **Autenticação JWT:** Sistema robusto com access tokens (24h) e refresh tokens (30 dias para gratuitos, infinito para premium).
- **Proteção de Trial:** Bloqueio automático após 30 dias com modal de upgrade.
- **Armazenamento Seguro:** Senhas com criptografia e rate limiting em endpoints sensíveis.

---

## 🛠️ Tecnologias Utilizadas

### **Backend & Inteligência Artificial**

| Tecnologia       | Função                                                           |
| :--------------- | :--------------------------------------------------------------- |
| **Flask**        | Orquestração da API, rotas e controle de sessão.                 |
| **Neura IA**     | Integração Python com o motor de IA local (Ollama).              |
| **PyMySQL**      | Conexão de alta performance com banco de dados MySQL.            |
| **Pillow (PIL)** | Processamento e otimização de uploads de imagens.                |
| **FPDF**         | Geração de relatórios PDF para usuários Premium.                 |

### **Frontend**

| Tecnologia         | Função                                                      |
| :----------------- | :---------------------------------------------------------- |
| **Vanilla JS**     | Gerenciamento de estado, requisições Fetch e lógica de SPA. |
| **Web Speech API** | Reconhecimento de voz e síntese de fala (Premium).          |
| **CSS3 Variables** | Tematização fácil e design consistente.                     |
| **Inter Font**     | Tipografia moderna focada em legibilidade.                  |
| **Marked.js**      | Renderização de Markdown nas respostas do chat.             |

---

## 🏗️ Estrutura do Projeto

```
AutoAssist/
├── app.py                  # Servidor principal
├── nogai.py                # Módulo de texto
├── vision_ai.py            # Pipeline de visão
├── report_generator.py     # Gerador de PDF
├── static/
│   ├── js/
│   │   └── auth.js         # Gerenciamento de autenticação JWT
│   └── reports/            # PDFs gerados
├── templates/
│   ├── home.html           # Landing page + Modal de Pagamento
│   ├── chat.html           # Interface do consultor + Histórico + Voz
│   ├── perfil.html         # Perfil do usuário
│   ├── login.html          # Login
│   └── cadastro.html       # Cadastro
└── requirements.txt        # Dependências Python
```

---

## 🚀 Como Executar o Projeto

### 1. Pré-requisitos

- Python 3.10+
- **Ollama** instalado e rodando no seu sistema
- Servidor MySQL (Ex: XAMPP, Workbench ou Docker)

### 2. Configuração dos Modelos (Ollama)

Antes de iniciar o Python, abra seu terminal e baixe os modelos necessários:

```bash
ollama pull qwen2:0.5b
ollama pull moondream
```

### 3. Instalar Dependências

```bash
pip install -r requirements.txt
```

### 4. Configurar Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
JWT_SECRET_KEY=sua_chave_secreta_aqui
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=autoassist
DB_PORT=3306
```

### 5. Executar Servidor

```bash
python app.py
```

O servidor estará disponível em `http://localhost:5000`

---

## 💰 Modelo de Monetização

### **Trial Gratuito (30 dias)**

- Acesso completo às funcionalidades de análise
- Após 30 dias, modal de upgrade bloqueia o acesso

### **Premium (R$ 29,90 - Pagamento Único)**

- Desbloqueio permanente
- Recursos exclusivos (PDF, Voz, Login Infinito)
- Simulação de pagamento via PIX (endpoint `/api/pay/mock`)

### **Implementação Técnica**

- Função `is_trial_expired(user)` verifica idade da conta
- Endpoint `/api/chat` retorna 402 (Payment Required) se expirado
- Modal não-dismissível força upgrade na `home.html`
- Endpoint `/api/pay/mock` simula confirmação de pagamento

---

## 📊 Endpoints da API

### **Autenticação**

- `POST /api/cadastro` - Registro de novo usuário
- `POST /api/login` - Login (retorna access + refresh tokens)
- `POST /api/refresh` - Renovação de access token (sliding expiration para Premium)

### **Usuário**

- `GET /api/user` - Dados do perfil (inclui `trial_expired` e `is_premium`)
- `PUT /api/user` - Atualização de nome/email

### **Chat**

- `POST /api/chat` - Envio de mensagem/imagem (bloqueado se trial expirado)
- `GET /api/chat/history` - Últimas 20 conversas

### **Premium**

- `POST /api/report` - Geração de PDF (requer `is_premium: true`)
- `POST /api/pay/mock` - Simulação de pagamento PIX

---

## 🎨 Design e UX

- **Dark Mode Nativo:** Interface otimizada para reduzir fadiga visual
- **Glassmorphism:** Efeitos modernos de vidro fosco
- **Micro-animações:** Feedback visual em todas as interações
- **Responsivo:** Adaptado para desktop, tablet e mobile
- **Acessibilidade:** Suporte a leitores de tela e navegação por teclado

---

## 🔒 Segurança

- **JWT com Refresh Tokens:** Sliding expiration para Premium
- **Bcrypt:** Hash de senhas com salt automático
- **Rate Limiting:** Proteção contra brute-force (20 req/min no chat)
- **Validação Server-Side:** Bloqueio de trial expirado no backend
- **CORS Configurado:** Proteção contra requisições não autorizadas

---

## 📝 Licença

Este projeto é proprietário e foi desenvolvido para fins educacionais e comerciais.

---

## 👨‍💻 Autor

Desenvolvido por **Júlio César** usando **Neura IA**.

---

## 🆘 Suporte

Para dúvidas ou problemas, entre em contato através do email de suporte ou abra uma issue no repositório.

# AutoAssis • Consultor Automotivo IA 🚗🤖

O **AutoAssis** é um ecossistema de inteligência artificial projetado para o mercado automotivo brasileiro. Ele combina processamento de linguagem natural e visão computacional para ajudar usuários com dúvidas sobre compra, manutenção e análise técnica de veículos e peças.

## ✨ Funcionalidades

* **Consultoria Especializada:** Respostas focadas no mercado brasileiro, modelos, versões e custo-benefício.
* **Visão Computacional:** Analisa fotos de veículos para identificar marca, modelo, estado de conservação e possíveis danos.
* **Interface Moderna:** Chat em estilo *dark mode* com design responsivo e fluidez de mensagens.
* **Segurança:** Sistema de autenticação robusto utilizando JWT e criptografia.
* **Histórico de Chat:** Armazenamento persistente das conversas em banco de dados.
* **Controle de Tráfego:** Proteção contra abusos via Rate Limiting.

## 🛠️ Tecnologias Utilizadas

### **Backend (Python/Flask)**

* **Flask:** Micro-framework para a API.
* **PyMySQL:** Conexão e pool com banco de dados MySQL.
* **Flask-JWT-Extended:** Gestão de tokens e sessões seguras.
* **Google GenAI:** Motor de inteligência artificial (Gemini 2.5 Flash).
* **Pillow (PIL):** Processamento e validação de imagens.

### **Frontend (Vanilla JS/CSS3)**

* **CSS3 Moderno:** Variáveis (Custom Properties), Glassmorphism e animações.
* **JavaScript:** Comunicação assíncrona (Fetch API) e conversão de Base64.
* **Inter Font:** Tipografia limpa e moderna.

---

## 🏗️ Estrutura do Projeto

* `app.py`: Servidor principal, rotas de API e lógica de autenticação.
* `nogai.py`: Integração com Gemini para conversas de texto (NOG Consultor).
* `vision_ai.py`: Módulo especializado em análise visual de veículos.
* `templates/`: Arquivos HTML (home, login, cadastro, chat).

---

## 🚀 Como Executar o Projeto

### 1. Pré-requisitos

* Python 3.10+
* MySQL Server
* Chave de API do Google AI Studio (Gemini)

### 2. Configuração do Ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
JWT_SECRET_KEY=sua_chave_secreta_aqui
GEMINI_API_KEY=sua_api_gemini_aqui
DB_HOST=localhost
DB_USER=seu_usuario
DB_PASSWORD=sua_senha
DB_NAME=nog_chat
DB_PORT=3306

```

### 3. Instalação

```bash
# Clone o repositório
git clone https://github.com/seu-usuario/nog-chat.git

# Instale as dependências
pip install -r requirements.txt

```

### 4. Inicialização

O banco de dados é inicializado automaticamente ao rodar o app pela primeira vez.

```bash
python app.py

```

O servidor estará disponível em `http://localhost:5000`.

---

## 🔒 Endpoints da API

| Rota | Método | Descrição |
| --- | --- | --- |
| `/api/cadastro` | POST | Cria um novo usuário. |
| `/api/login` | POST | Autentica e retorna o token JWT. |
| `/api/chat` | POST | Envia texto ou imagem para a IA (Requer JWT). |
| `/api/chat/history` | GET | Recupera o histórico do usuário (Requer JWT). |

---

## 📝 Licença

Este projeto é para fins educacionais e de consultoria automotiva. Verifique os termos de uso da API do Google Gemini.

---

**Desenvolvido por Júlio César** *O NOG é o seu parceiro inteligente na estrada.*
# AutoAssist • Consultor Automotivo Inteligente 🚗🤖

![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)
![Flask](https://img.shields.io/badge/Flask-000000?style=for-the-badge&logo=flask&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-4479A1?style=for-the-badge&logo=mysql&logoColor=white)
![Neura IA](https://img.shields.io/badge/AI_Local-Ollama-blue?style=for-the-badge&logo=openai&logoColor=white)

O **AutoAssist IA** é um ecossistema de inteligência artificial de última geração, desenvolvido especificamente para o mercado automotivo brasileiro. A plataforma integra Processamento de Linguagem Natural (NLP) e Visão Computacional para fornecer diagnósticos precisos, avaliações de mercado e consultoria técnica especializada, operando de forma **100% privada e local** através da integração com a **Neura IA**.

---

## ✨ Funcionalidades

* **Consultoria Especializada (NOG):** O assistente "NOG" oferece respostas focadas no mercado brasileiro, analisando modelos, versões, manutenção e custo-benefício sem "achismos".
* **Visão Computacional:** Pipeline que analisa fotos de veículos para identificar modelo, ano aproximado, danos na lataria e estado de conservação.
* **Privacidade Total:** Graças ao uso do **Ollama**, nenhum dado ou imagem sai do seu servidor. Todo o processamento é local.
* **Interface Premium:** Design responsivo com *Dark Mode*, efeitos de *Glassmorphism* e transições suaves.
* **Segurança:** Sistema de autenticação robusto via JWT e armazenamento seguro de senhas.

---

## 🛠️ Tecnologias Utilizadas

### **Backend & Inteligência Artificial**

| Tecnologia | Função |
| :--- | :--- |
| **Flask** | Orquestração da API, rotas e controle de sessão. |
| **Neura IA** | Integração Python com o motor de IA local (Ollama). |
| **Qwen2:0.5b** | Modelo de linguagem (LLM) leve e rápido para o chat de texto. |
| **Moondream** | Modelo de visão especializado para extração de dados de imagens. |
| **PyMySQL** | Conexão de alta performance com banco de dados MySQL. |
| **Pillow (PIL)** | Processamento e otimização de uploads de imagens. |

### **Frontend**

| Tecnologia | Função |
| :--- | :--- |
| **Vanilla JS** | Gerenciamento de estado, requisições Fetch e lógica de SPA. |
| **CSS3 Variables** | Tematização fácil e design consistente. |
| **Inter Font** | Tipografia moderna focada em legibilidade. |

---

## 🏗️ Estrutura do Projeto

* `app.py`: Servidor principal. Gerencia rotas, autenticação JWT e endpoints da API.
* `nogai.py`: Módulo de texto. Controla a persona do "NOG" usando o modelo **Qwen2**.
* `vision_ai.py`: Módulo de visão. Implementa o pipeline **Moondream (Ver) → Qwen (Explicar)**.
* `templates/`:
    * `home.html`: Landing page.
    * `chat.html`: Interface do consultor.
    * `perfil.html`: Dashboard do usuário.
    * `login.html` / `cadastro.html`: Fluxos de acesso.

---

## 🚀 Como Executar o Projeto

### 1. Pré-requisitos

* Python 3.10+
* **Ollama** instalado e rodando no seu sistema.
* Servidor MySQL (Ex: XAMPP, Workbench ou Docker).

### 2. Configuração dos Modelos (Ollama)

Antes de iniciar o Python, abra seu terminal e baixe os modelos necessários:

```bash
ollama pull qwen2:0.5b
ollama pull moondream
```

## 3. Executar Servidor
```bash
python app.py
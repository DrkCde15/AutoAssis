# app.py - Backend Flask Otimizado para NOG e NeuraVision
import os
import logging
import base64
from datetime import timedelta, datetime, timezone
from contextlib import contextmanager
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from flask_jwt_extended import (
    JWTManager,
    create_access_token,
    jwt_required,
    get_jwt_identity
)
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from passlib.hash import bcrypt
from dotenv import load_dotenv
import pymysql
from pymysql.cursors import DictCursor

# Importação dos módulos de IA locais
from nogai import gerar_resposta
from vision_ai import analisar_imagem

# ======================================================
# CONFIGURAÇÃO DE LOGGING
# ======================================================
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ======================================================
# CARREGAMENTO DE AMBIENTE E CONFIGURAÇÕES
# ======================================================
load_dotenv()

# Validação de variáveis críticas
required_env = ["JWT_SECRET_KEY", "DB_HOST", "DB_USER", "DB_PASSWORD", "DB_NAME"]
missing_env = [var for var in required_env if not os.getenv(var)]
if missing_env:
    logger.error(f"Faltam variáveis de ambiente: {missing_env}")
    raise ValueError(f"Variáveis obrigatórias não encontradas: {missing_env}")

app = Flask(__name__)
app.config.update(
    JWT_SECRET_KEY=os.getenv("JWT_SECRET_KEY"),
    JWT_ACCESS_TOKEN_EXPIRES=timedelta(hours=24),
    JWT_TOKEN_LOCATION=['headers'],
    JWT_HEADER_NAME='Authorization',
    JWT_HEADER_TYPE='Bearer'
)

jwt = JWTManager(app)

# Configuração de CORS para permitir comunicação com o Frontend
CORS(app, resources={
    r"/api/*": {
        "origins": "*",
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})

# Limiter para proteger o hardware de sobrecarga (IA local é pesada)
limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    default_limits=["500 per day", "100 per hour"],
    storage_uri="memory://"
)

# ======================================================
# CONFIGURAÇÃO DO BANCO DE DADOS (MYSQL)
# ======================================================
MYSQL_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': int(os.getenv('DB_PORT', 3306)),
    'user': os.getenv('DB_USER'),
    'password': os.getenv('DB_PASSWORD'),
    'database': os.getenv('DB_NAME'),
    'charset': 'utf8mb4',
    'cursorclass': DictCursor,
    'autocommit': True
}

@contextmanager
def get_db():
    """Context manager para gerir conexões MySQL de forma segura"""
    conn = pymysql.connect(**MYSQL_CONFIG)
    cursor = conn.cursor()
    try:
        yield cursor, conn
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        cursor.close()
        conn.close()

def init_db():
    """Inicialização das tabelas do banco de dados se não existirem"""
    try:
        with get_db() as (cursor, conn):
            # Tabela de Utilizadores
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    nome VARCHAR(255) NOT NULL,
                    email VARCHAR(255) UNIQUE NOT NULL,
                    password VARCHAR(255) NOT NULL,
                    data_criacao DATETIME NOT NULL,
                    INDEX idx_email (email)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            """)
            
            # Tabela de Chats (Histórico)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS chats (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    user_id INT NOT NULL,
                    categoria VARCHAR(50) DEFAULT 'geral',
                    mensagem_usuario TEXT NOT NULL,
                    resposta_ia TEXT NOT NULL,
                    data_criacao DATETIME NOT NULL,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                    INDEX idx_user_history (user_id, data_criacao)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            """)
            logger.info("✓ Tabelas MySQL verificadas/inicializadas")
    except Exception as e:
        logger.error(f"Erro ao inicializar base de dados: {e}")

init_db()

# ======================================================
# HELPERS DE AUTENTICAÇÃO
# ======================================================
def hash_password(pwd):
    return bcrypt.hash(pwd[:72].encode('utf-8'))

def verify_password(pwd, hashed):
    try:
        return bcrypt.verify(pwd[:72].encode('utf-8'), hashed)
    except:
        return False

# ======================================================
# ROTAS DE PÁGINAS (FRONTEND)
# ======================================================
@app.route("/")
def home(): return render_template("home.html")

@app.route("/login")
def login_page(): return render_template("login.html")

@app.route("/cadastro")
def cadastro_page(): return render_template("cadastro.html")

@app.route("/chat")
def chat_page(): return render_template("chat.html")

@app.route("/perfil")
def perfil_page(): return render_template("perfil.html")

# ======================================================
# ENDPOINTS DA API
# ======================================================

@app.route("/api/home", methods=["GET"])
@jwt_required()
def get_home_data():
    """Retorna dados dinâmicos para o Dashboard da Home"""
    user_id = int(get_jwt_identity())
    try:
        with get_db() as (cursor, conn):
            # Buscar o nome do utilizador
            cursor.execute("SELECT nome FROM users WHERE id = %s", (user_id,))
            user = cursor.fetchone()
            
            # Buscar as últimas 5 atividades
            cursor.execute("""
                SELECT mensagem_usuario, data_criacao 
                FROM chats 
                WHERE user_id = %s 
                ORDER BY data_criacao DESC LIMIT 5
            """, (user_id,))
            atividades = cursor.fetchall()
            
            # Formatar datas para o frontend
            for ativ in atividades:
                ativ['data_criacao'] = ativ['data_criacao'].strftime("%d/%m %H:%M")

            return jsonify({
                "boas_vindas": f"Olá, {user['nome'] if user else 'Entusiasta'}!",
                "atividades_recentes": atividades,
                "status_ia": "Online"
            }), 200
    except Exception as e:
        logger.error(f"Erro ao carregar dados da Home: {e}")
        return jsonify(error="Erro ao processar Dashboard"), 500

@app.route("/api/cadastro", methods=["POST"])
@limiter.limit("5 per minute")
def cadastro():
    data = request.get_json()
    nome = data.get("nome", "").strip()
    email = data.get("email", "").lower().strip()
    password = data.get("password", "").strip()

    if not nome or not email or len(password) < 6:
        return jsonify(error="Dados inválidos ou senha muito curta"), 400

    try:
        with get_db() as (cursor, conn):
            cursor.execute("SELECT id FROM users WHERE email = %s", (email,))
            if cursor.fetchone():
                return jsonify(error="Email já registado"), 409
            
            cursor.execute(
                "INSERT INTO users (nome, email, password, data_criacao) VALUES (%s, %s, %s, %s)",
                (nome, email, hash_password(password), datetime.now(timezone.utc))
            )
        return jsonify(success=True), 201
    except Exception as e:
        logger.error(f"Erro no registo: {e}")
        return jsonify(error="Erro interno"), 500

@app.route("/api/login", methods=["POST"])
@limiter.limit("10 per minute")
def login():
    data = request.get_json()
    email = data.get("email", "").lower().strip()
    password = data.get("password", "")

    try:
        with get_db() as (cursor, conn):
            cursor.execute("SELECT * FROM users WHERE email = %s", (email,))
            user = cursor.fetchone()
            
            if not user or not verify_password(password, user["password"]):
                return jsonify(error="Credenciais inválidas"), 401
            
            token = create_access_token(identity=str(user["id"]))
            return jsonify(access_token=token, user={"nome": user["nome"], "email": user["email"]}), 200
    except Exception as e:
        logger.error(f"Erro no login: {e}")
        return jsonify(error="Erro interno"), 500

@app.route("/api/user", methods=["GET"])
@jwt_required()
def get_profile():
    """Retorna dados do perfil do utilizador logado"""
    user_id = int(get_jwt_identity())
    try:
        with get_db() as (cursor, conn):
            # Buscar dados do utilizador
            cursor.execute("SELECT nome, email, data_criacao FROM users WHERE id = %s", (user_id,))
            user = cursor.fetchone()
            
            if not user:
                return jsonify(error="Utilizador não encontrado"), 404
            
            # Buscar estatísticas (total de consultas realizadas)
            cursor.execute("SELECT COUNT(*) as total FROM chats WHERE user_id = %s", (user_id,))
            stats = cursor.fetchone()

            return jsonify({
                "nome": user["nome"],
                "email": user["email"],
                "data_criacao": user["data_criacao"].strftime("%d/%m/%Y"),
                "total_consultas": stats["total"] if stats else 0
            }), 200
    except Exception as e:
        logger.error(f"Erro ao buscar perfil: {e}")
        return jsonify(error="Erro ao processar dados do perfil"), 500

@app.route("/api/chat", methods=["POST"])
@jwt_required()
@limiter.limit("15 per minute") # Limite para evitar travar o PC com IA local
def chat():
    try:
        user_id = int(get_jwt_identity())
        data = request.get_json()
        
        message = data.get("message", "").strip()
        categoria = data.get("category", "geral").lower()
        image_b64 = data.get("image")

        if not message and not image_b64:
            return jsonify(error="Conteúdo vazio"), 400

        # Lógica de IA Local (NOG)
        if image_b64:
            logger.info(f"📸 Análise visual requisitada pelo user {user_id}")
            # Gera nome único para o ficheiro temporário
            timestamp = int(datetime.now().timestamp())
            temp_filename = f"temp_user_{user_id}_{timestamp}.png"
            
            # Chama o Pipeline de Dois Estágios (Visão + Linguagem)
            resposta = analisar_imagem(image_b64, message or "Analise este veículo", filename=temp_filename)
            tipo = "analise_imagem"
        else:
            # Chat de texto puro com a persona NOG
            resposta = gerar_resposta(message, user_id, categoria)
            tipo = "chat"

        # Guardar na base de dados
        with get_db() as (cursor, conn):
            cursor.execute(
                "INSERT INTO chats (user_id, categoria, mensagem_usuario, resposta_ia, data_criacao) VALUES (%s, %s, %s, %s, %s)",
                (user_id, categoria, message or "[Imagem]", resposta, datetime.now(timezone.utc))
            )

        return jsonify(success=True, response=resposta, tipo=tipo), 200

    except Exception as e:
        logger.error(f"Erro no endpoint de chat: {e}", exc_info=True)
        return jsonify(error="Erro ao processar a consulta do NOG."), 500

@app.route("/api/chat/history", methods=["GET"])
@jwt_required()
def chat_history():
    user_id = int(get_jwt_identity())
    try:
        with get_db() as (cursor, conn):
            cursor.execute(
                "SELECT mensagem_usuario, resposta_ia, data_criacao FROM chats WHERE user_id = %s ORDER BY data_criacao DESC LIMIT 20",
                (user_id,)
            )
            history = cursor.fetchall()
            return jsonify(chats=list(reversed(history))), 200
    except Exception as e:
        return jsonify(error="Erro ao recuperar histórico"), 500

# ======================================================
# INICIALIZAÇÃO DO SERVIDOR
# ======================================================
if __name__ == "__main__":
    # Rodar em host 0.0.0.0 para permitir acesso na rede local
    app.run(debug=False, host="0.0.0.0", port=5000)
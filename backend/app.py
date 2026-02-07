import sys
from unittest.mock import MagicMock
sys.modules["speech_recognition"] = MagicMock()
sys.modules["pyaudio"] = MagicMock()
sys.modules["pyttsx3"] = MagicMock()
import os
import logging
from datetime import timedelta, datetime, timezone
from contextlib import contextmanager
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_jwt_extended import (
    JWTManager,
    create_access_token,
    create_refresh_token,
    jwt_required,
    get_jwt_identity
)
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_talisman import Talisman  # [NOVO] Security Headers
from passlib.hash import bcrypt
from dotenv import load_dotenv
import pymysql
from pymysql.cursors import DictCursor

# Funções auxiliares (assumindo que existem nos arquivos originais)
from nogai import gerar_resposta
from vision_ai import analisar_imagem
from report_generator import criar_relatorio_pdf

# ======================================================
# CONFIGURAÇÃO DE LOGGING
# ======================================================
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

load_dotenv()

app = Flask(__name__)

# [SEGURANÇA] Cabeçalhos HTTP Seguros
# force_https=True em produção garante que nada trafegue sem SSL
is_production = os.getenv('FLASK_ENV') == 'production'
Talisman(app, force_https=is_production, content_security_policy=None) 

# [SEGURANÇA] Verificação estrita da Secret Key
jwt_secret = os.getenv("JWT_SECRET_KEY")
if not jwt_secret:
    raise ValueError("FATAL: JWT_SECRET_KEY não encontrada nas variáveis de ambiente! O servidor não pode iniciar inseguro.")

app.config.update(
    JWT_SECRET_KEY=jwt_secret,
    JWT_ACCESS_TOKEN_EXPIRES=timedelta(hours=24),
    JWT_REFRESH_TOKEN_EXPIRES=timedelta(days=30),
)

jwt = JWTManager(app)

# [SEGURANÇA] CORS Restrito
# Altere as origens conforme necessário. Nunca use "*" com credenciais em produção.
allowed_origins = [
    "https://autoassis.onrender.com",  # Produção
    "http://localhost:5000",           # Dev Local
    "http://127.0.0.1:5000"            # Dev Local
]

CORS(app, resources={r"/api/*": {"origins": allowed_origins}}, supports_credentials=True)

limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    default_limits=["500 per day", "100 per hour"],
    storage_uri="memory://"
)

# Configuração do Banco
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
    with get_db() as (cursor, conn):
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nome VARCHAR(100) NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                is_premium BOOLEAN DEFAULT FALSE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS chats (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT,
                mensagem_usuario TEXT,
                resposta_ia TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """)
        print("✅ Banco de dados inicializado com sucesso!")

@app.before_request
def first_request():
    if not hasattr(app, "_db_initialized"):
        try:
            init_db()
            app._db_initialized = True
        except Exception as e:
            logging.error(f"⚠️ Falha ao inicializar banco: {e}")

def is_trial_expired(user):
    if user.get("is_premium"): return False
    created_at = user["created_at"]
    if isinstance(created_at, str): created_at = datetime.fromisoformat(created_at)
    if created_at.tzinfo is None: created_at = created_at.replace(tzinfo=timezone.utc)
    return (datetime.now(timezone.utc) - created_at).days >= 30

@app.route("/health")
def health(): return jsonify(status="healthy"), 200

# --- AUTH ENDPOINTS ---
@app.route("/api/cadastro", methods=["POST"])
def cadastro():
    data = request.get_json()
    nome, email, password = data.get("nome"), data.get("email"), data.get("password")
    if not nome or not email or len(password) < 6: return jsonify(error="Dados inválidos"), 400
    try:
        with get_db() as (cursor, conn):
            cursor.execute("INSERT INTO users (nome, email, password) VALUES (%s, %s, %s)",
                           (nome, email.lower(), bcrypt.hash(password)))
        return jsonify(success=True), 201
    except Exception as e:
        logging.error(f"❌ Erro no cadastro: {e}")
        return jsonify(error="Erro ao processar cadastro ou email já existe"), 409

@app.route("/api/login", methods=["POST"])
def login():
    data = request.get_json()
    email, password = data.get("email"), data.get("password")
    with get_db() as (cursor, conn):
        cursor.execute("SELECT * FROM users WHERE email = %s", (email.lower(),))
        user = cursor.fetchone()
        if not user or not bcrypt.verify(password, user["password"]): return jsonify(error="Credenciais inválidas"), 401
        return jsonify(
            access_token=create_access_token(identity=str(user["id"])),
            refresh_token=create_refresh_token(identity=str(user["id"])),
            user={"nome": user["nome"], "is_premium": bool(user["is_premium"]), "trial_expired": is_trial_expired(user)}
        ), 200

@app.route("/api/user", methods=["GET"])
@jwt_required()
def get_user():
    user_id = get_jwt_identity()
    with get_db() as (cursor, conn):
        cursor.execute("SELECT nome, email, is_premium, created_at FROM users WHERE id = %s", (user_id,))
        user = cursor.fetchone()
        return jsonify({**user, "trial_expired": is_trial_expired(user), "is_premium": bool(user["is_premium"])}), 200

@app.route("/api/chat", methods=["POST"])
@jwt_required()
def chat():
    user_id = get_jwt_identity()
    data = request.get_json()
    msg, img_b64 = data.get("message"), data.get("image")
    try:
        with get_db() as (cursor, conn):
            cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))
            user = cursor.fetchone()
            if is_trial_expired(user): return jsonify(error="TRIAL_EXPIRED"), 402
            
            resposta = analisar_imagem(img_b64, msg) if img_b64 else gerar_resposta(msg, user_id)
            cursor.execute("INSERT INTO chats (user_id, mensagem_usuario, resposta_ia) VALUES (%s, %s, %s)",
                           (user_id, msg or "[Imagem]", resposta))
            return jsonify(response=resposta)
    except Exception as e:
        logging.error(f"❌ Erro na rota /api/chat: {e}")
        return jsonify(error="Erro interno ao processar chat."), 500

@app.route("/api/chat/history", methods=["GET"])
@jwt_required()
def get_chat_history():
    user_id = get_jwt_identity()
    try:
        with get_db() as (cursor, conn):
            cursor.execute("""
                SELECT mensagem_usuario, resposta_ia, created_at 
                FROM chats 
                WHERE user_id = %s 
                ORDER BY created_at ASC
            """, (user_id,))
            chats = cursor.fetchall()
            # Converte datetime para string se necessário
            for c in chats:
                if isinstance(c['created_at'], datetime):
                    c['created_at'] = c['created_at'].isoformat()
            return jsonify(chats=chats), 200
    except Exception as e:
        logging.error(f"❌ Erro ao buscar histórico: {e}")
        return jsonify(error="Erro ao buscar histórico"), 500

# [NOVO] Endpoint de Relatório (Faltava no original)
@app.route("/api/report", methods=["POST"])
@jwt_required()
def generate_report_endpoint():
    user_id = get_jwt_identity()
    data = request.get_json()
    text_content = data.get("text")
    
    if not text_content:
        return jsonify(error="Conteúdo do relatório vazio"), 400

    try:
        # Verifica se é premium antes de gerar
        with get_db() as (cursor, conn):
            cursor.execute("SELECT is_premium FROM users WHERE id = %s", (user_id,))
            user = cursor.fetchone()
            if not user or not user['is_premium']:
                return jsonify(error="Recurso exclusivo para Premium"), 403
        
        # Gera o PDF (assume que criar_relatorio_pdf retorna o caminho ou URL)
        # Se sua função retorna o arquivo físico, você precisará usar send_file
        # Aqui, simulo que retorna uma URL pública/estática
        report_url = criar_relatorio_pdf(text_content, user_id) 
        
        return jsonify(url=report_url), 200
    except Exception as e:
        logging.error(f"❌ Erro ao gerar relatório: {e}")
        return jsonify(error="Falha na geração do PDF"), 500

@app.route("/api/pay/mock", methods=["POST"])
@jwt_required()
def pay():
    user_id = get_jwt_identity()
    with get_db() as (cursor, conn):
        cursor.execute("UPDATE users SET is_premium = TRUE WHERE id = %s", (user_id,))
    return jsonify(success=True, message="Upgrade concluído!")

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
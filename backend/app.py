# app.py - API Backend para AutoAssist
import sys
from unittest.mock import MagicMock

# MOCK para bibliotecas de áudio (Necessário para rodar no Render/Linux sem drivers de som)
sys.modules["speech_recognition"] = MagicMock()
sys.modules["pyaudio"] = MagicMock()
sys.modules["pyttsx3"] = MagicMock()

import os
# BYPASS para Cloudflare Tunnel (Evita a tela de "Friendly Reminder" no Render)
import requests
original_get = requests.get
def patched_get(*args, **kwargs):
    headers = kwargs.get('headers', {}).copy()
    headers['bypass-tunnel-reminder'] = 'true'
    headers['User-Agent'] = 'Mozilla/5.0'
    kwargs['headers'] = headers
    return original_get(*args, **kwargs)
requests.get = patched_get
requests.post = lambda *args, **kwargs: original_get(*args, **kwargs) # Alias simplificado se necessário
import logging
import uuid
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
from passlib.hash import bcrypt
from dotenv import load_dotenv
import pymysql
from pymysql.cursors import DictCursor

# Importação dos módulos de IA locais
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
app.config.update(
    JWT_SECRET_KEY=os.getenv("JWT_SECRET_KEY", "super-secret-key"),
    JWT_ACCESS_TOKEN_EXPIRES=timedelta(hours=24),
    JWT_REFRESH_TOKEN_EXPIRES=timedelta(days=30),
)

jwt = JWTManager(app)
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)

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
    """Cria as tabelas se não existirem."""
    with get_db() as (cursor, conn):
        # Tabela de Usuários
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nome VARCHAR(100) NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                is_premium BOOLEAN DEFAULT FALSE,
                data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        # Tabela de Chats
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS chats (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT,
                mensagem_usuario TEXT,
                resposta_ia TEXT,
                data DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """)
        print("✅ Banco de dados inicializado com sucesso!")

# Inicializa o banco ao carregar o app de forma segura
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
    created_at = user["data_criacao"]
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
            cursor.execute("INSERT INTO users (nome, email, password, data_criacao) VALUES (%s, %s, %s, %s)",
                         (nome, email.lower(), bcrypt.hash(password), datetime.now(timezone.utc)))
        return jsonify(success=True), 201
    except: return jsonify(error="Erro ou email já existe"), 409

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
        cursor.execute("SELECT nome, email, is_premium, data_criacao FROM users WHERE id = %s", (user_id,))
        user = cursor.fetchone()
        return jsonify({**user, "trial_expired": is_trial_expired(user), "is_premium": bool(user["is_premium"])}), 200

@app.route("/api/chat", methods=["POST"])
@jwt_required()
def chat():
    user_id = get_jwt_identity()
    data = request.get_json()
    msg, img_b64 = data.get("message"), data.get("image")
    with get_db() as (cursor, conn):
        cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))
        user = cursor.fetchone()
        if is_trial_expired(user): return jsonify(error="TRIAL_EXPIRED"), 402
        
        resposta = analisar_imagem(img_b64, msg) if img_b64 else gerar_resposta(msg, user_id)
        cursor.execute("INSERT INTO chats (user_id, mensagem_usuario, resposta_ia, data_criacao) VALUES (%s, %s, %s, %s)",
                     (user_id, msg or "[Imagem]", resposta, datetime.now(timezone.utc)))
        return jsonify(response=resposta)

@app.route("/api/pay/mock", methods=["POST"])
@jwt_required()
def pay():
    user_id = get_jwt_identity()
    with get_db() as (cursor, conn):
        cursor.execute("UPDATE users SET is_premium = TRUE WHERE id = %s", (user_id,))
    return jsonify(success=True, message="Upgrade concluído!")

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
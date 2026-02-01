# app.py - Backend Flask
import os
import logging
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
from nogai import gerar_resposta
from vision_ai import analisar_imagem

# ======================================================
# LOGGING
# ======================================================
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ======================================================
# CONFIG
# ======================================================
load_dotenv()

# Validar variáveis de ambiente
required_env = ["JWT_SECRET_KEY", "GEMINI_API_KEY", "DB_HOST", "DB_USER", "DB_PASSWORD", "DB_NAME"]
missing_env = [var for var in required_env if not os.getenv(var)]
if missing_env:
    logger.error(f"Variáveis de ambiente faltando: {missing_env}")
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
logger.info("JWT configurado com sucesso")

CORS(app, resources={
    r"/api/*": {
        "origins": "*",
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})

limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"],
    storage_uri="memory://"
)

# ======================================================
# MYSQL CONFIG
# ======================================================
MYSQL_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': int(os.getenv('DB_PORT', 3306)),
    'user': os.getenv('DB_USER'),
    'password': os.getenv('DB_PASSWORD'),
    'database': os.getenv('DB_NAME'),
    'charset': 'utf8mb4',
    'cursorclass': DictCursor,
    'autocommit': False
}

# ======================================================
# CONNECTION POOL
# ======================================================
class MySQLConnectionPool:
    def __init__(self, config, pool_size=5):
        self.config = config
        self.pool_size = pool_size
        self.connections = []
        self._create_pool()
    
    def _create_pool(self):
        for _ in range(self.pool_size):
            conn = pymysql.connect(**self.config)
            self.connections.append(conn)
        logger.info(f"✓ MySQL pool criado com {self.pool_size} conexões")
    
    @contextmanager
    def get_connection(self):
        conn = None
        try:
            conn = self.connections.pop(0) if self.connections else pymysql.connect(**self.config)
            if not conn.open:
                conn = pymysql.connect(**self.config)
            yield conn
        except Exception as e:
            if conn:
                conn.rollback()
            raise e
        finally:
            if conn and conn.open:
                self.connections.append(conn)

# Criar pool
db_pool = MySQLConnectionPool(MYSQL_CONFIG, pool_size=5)

@contextmanager
def get_db():
    """Context manager para conexões MySQL"""
    with db_pool.get_connection() as conn:
        cursor = conn.cursor()
        try:
            yield cursor, conn
        finally:
            cursor.close()

# ======================================================
# DATABASE INIT
# ======================================================
def init_db():
    """Inicializar banco MySQL"""
    try:
        with db_pool.get_connection() as conn:
            cursor = conn.cursor()
            
            # Tabela users
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    nome VARCHAR(255) NOT NULL,
                    email VARCHAR(255) UNIQUE NOT NULL,
                    password VARCHAR(255) NOT NULL,
                    data_criacao DATETIME NOT NULL,
                    INDEX idx_email (email)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            """)
            
            # Tabela chats
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS chats (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    user_id INT NOT NULL,
                    categoria VARCHAR(50) DEFAULT 'geral',
                    mensagem_usuario TEXT NOT NULL,
                    resposta_ia TEXT NOT NULL,
                    tokens_usados INT DEFAULT 0,
                    data_criacao DATETIME NOT NULL,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                    INDEX idx_user_id (user_id),
                    INDEX idx_data_criacao (data_criacao),
                    INDEX idx_user_date (user_id, data_criacao)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            """)
            
            conn.commit()
            logger.info("✓ Banco MySQL inicializado")
    except Exception as e:
        logger.error(f"Erro ao inicializar MySQL: {e}")
        raise

init_db()

# ======================================================
# HELPERS
# ======================================================
def hash_password(pwd):
    pwd_bytes = pwd[:72].encode('utf-8')
    return bcrypt.hash(pwd_bytes)

def verify_password(pwd, hashed):
    pwd_bytes = pwd[:72].encode('utf-8')
    try:
        return bcrypt.verify(pwd_bytes, hashed)
    except Exception as e:
        logger.error(f"Erro ao verificar senha: {e}")
        return False

def get_user_by_email(email):
    with get_db() as (cursor, conn):
        cursor.execute("SELECT * FROM users WHERE email = %s", (email,))
        return cursor.fetchone()

def get_user_by_id(user_id):
    with get_db() as (cursor, conn):
        cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))
        return cursor.fetchone()

# ======================================================
# ROTAS HTML
# ======================================================
@app.route("/", methods=["GET"])
def home():
    try:
        return render_template("home.html")
    except:
        return jsonify(error="Página não encontrada"), 404

@app.route("/login", methods=["GET"])
def login_page():
    try:
        return render_template("login.html")
    except:
        return jsonify(error="Página não encontrada"), 404

@app.route("/cadastro", methods=["GET"])
def cadastro_page():
    try:
        return render_template("cadastro.html")
    except:
        return jsonify(error="Página não encontrada"), 404

@app.route("/chat", methods=["GET"])
def chat_page():
    try:
        return render_template("chat.html")
    except:
        return jsonify(error="Página não encontrada"), 404

@app.route("/perfil", methods=["GET"])
def perfil_page():
    try:
        return render_template("perfil.html")
    except Exception as e:
        logger.error(f"Erro ao carregar página de perfil: {e}", exc_info=True)
        return jsonify(error="Página de perfil não encontrada"), 404

# ======================================================
# AUTH
# ======================================================
@app.route("/api/cadastro", methods=["POST"])
@limiter.limit("5/minute")
def cadastro():
    try:
        data = request.get_json()
        if not data:
            return jsonify(error="JSON inválido"), 400
        
        nome = data.get("nome", "").strip()
        email = data.get("email", "").lower().strip()
        password = data.get("password", "").strip()
        
        if not nome or len(nome) < 2:
            return jsonify(error="Nome deve ter pelo menos 2 caracteres"), 400
        if not email or "@" not in email:
            return jsonify(error="Email inválido"), 400
        if len(password) < 6:
            return jsonify(error="Senha deve ter pelo menos 6 caracteres"), 400
        if len(password) > 72:
            return jsonify(error="Senha não pode ter mais de 72 caracteres"), 400
        
        if get_user_by_email(email):
            return jsonify(error="Email já cadastrado"), 409
        
        with get_db() as (cursor, conn):
            cursor.execute(
                "INSERT INTO users (nome, email, password, data_criacao) VALUES (%s, %s, %s, %s)",
                (nome, email, hash_password(password), datetime.now(timezone.utc))
            )
            conn.commit()
        
        logger.info("✓ Novo usuário cadastrado")
        return jsonify(success=True, message="Cadastro realizado"), 201
    except Exception as e:
        logger.error(f"Erro ao cadastrar: {e}", exc_info=True)
        return jsonify(error="Erro ao processar cadastro"), 500

@app.route("/api/login", methods=["POST"])
@limiter.limit("10/minute")
def login():
    try:
        data = request.get_json()
        if not data:
            return jsonify(error="JSON inválido"), 400
        
        email = data.get("email", "").lower().strip()
        password = data.get("password", "")
        
        if not email or not password:
            return jsonify(error="Email e senha obrigatórios"), 400
        
        user = get_user_by_email(email)
        if not user or not verify_password(password, user["password"]):
            return jsonify(error="Email ou senha incorretos"), 401
        
        access_token = create_access_token(
            identity=str(user["id"]),
            additional_claims={"email": email}
        )
        
        logger.info("Login realizado com sucesso")
        return jsonify(
            access_token=access_token,
            user={
                "id": user["id"],
                "nome": user["nome"],
                "email": user["email"]
            }
        ), 200
    except Exception as e:
        logger.error(f"Erro ao fazer login: {e}", exc_info=True)
        return jsonify(error="Erro ao processar login"), 500

# ======================================================
# USUARIO
# ======================================================
@app.route("/api/user", methods=["GET"])
@jwt_required()
def get_user_info():
    try:
        current_user_identity = get_jwt_identity()

        user_id = int(current_user_identity)
        user = get_user_by_id(user_id)

        if not user:
            logger.warning(f"Usuário com ID {user_id} não encontrado após validação JWT.")
            return jsonify(error="Usuário não encontrado"), 404

        return jsonify({
            "id": user["id"],
            "nome": user["nome"],
            "email": user["email"],
            "data_criacao": user["data_criacao"].isoformat() if hasattr(user["data_criacao"], 'isoformat') else str(user["data_criacao"])
        }), 200
    except Exception as e:
        logger.error(f"Erro ao buscar usuário na rota /api/user: {e}", exc_info=True)
        return jsonify(error="Erro ao buscar informações"), 500

@app.route("/api/logout", methods=["POST"])
@jwt_required()
def logout():
    try:
        user_id = int(get_jwt_identity())
        logger.info("Logout realizado")
        return jsonify(success=True), 200
    except Exception as e:
        logger.error(f"Erro ao fazer logout: {e}")
        return jsonify(error="Erro ao fazer logout"), 500

# ======================================================
# CHAT IA
# ======================================================
@app.route("/api/chat", methods=["POST"])
@jwt_required()
@limiter.limit("20/minute")
def chat():
    try:
        user_id = int(get_jwt_identity())
        data = request.get_json()
        
        if not data:
            return jsonify(error="JSON inválido"), 400
        
        message = data.get("message", "").strip()
        categoria = data.get("category", "geral").lower()
        image_b64 = data.get("image")
        
        if not message and not image_b64:
            return jsonify(error="Envie mensagem ou imagem"), 400
        
        if message and len(message) > 2000:
            return jsonify(error="Mensagem muito longa"), 400
        
        # Processar com IA
        if image_b64:
            # 1. Limpeza do Base64
            if ',' in image_b64:
                image_b64 = image_b64.split(',')[1]
            
            # 2. Criar um nome de arquivo único por usuário
            nome_temp = f"temp_user_{user_id}.png"
            
            # 3. Chamar a análise (Ajustado para 'filename' para bater com vision_ai.py)
            resposta = analisar_imagem(image_b64, message or "Analise esta imagem", filename=nome_temp)
            tipo_resposta = "analise_imagem"
        else:
            resposta = gerar_resposta(message, user_id, categoria)
            tipo_resposta = "chat"
        
        # Salvar histórico
        try:
            with get_db() as (cursor, conn):
                cursor.execute(
                    """INSERT INTO chats (user_id, categoria, mensagem_usuario, resposta_ia, data_criacao) 
                       VALUES (%s, %s, %s, %s, %s)""",
                    (user_id, categoria, message or "[Imagem]", resposta, datetime.now(timezone.utc))
                )
                conn.commit()
        except Exception as db_error:
            logger.error(f"Erro ao salvar chat: {db_error}")
        
        logger.info("Chat processado")
        return jsonify(success=True, response=resposta, text=resposta, tipo=tipo_resposta), 200
    except Exception as e:
        logger.error(f"Erro no chat: {e}", exc_info=True)
        return jsonify(error="Erro ao processar mensagem"), 500

@app.route("/api/chat/history", methods=["GET"])
@jwt_required()
def chat_history():
    try:
        user_id = int(get_jwt_identity())
        limit = request.args.get('limit', 20, type=int)
        
        with get_db() as (cursor, conn):
            cursor.execute(
                """SELECT mensagem_usuario, resposta_ia, categoria, data_criacao 
                   FROM chats WHERE user_id = %s 
                   ORDER BY data_criacao DESC LIMIT %s""",
                (user_id, min(limit, 100))
            )
            chats = cursor.fetchall()
        
        return jsonify(chats=list(reversed(chats))), 200
    except Exception as e:
        logger.error(f"Erro ao buscar histórico: {e}")
        return jsonify(error="Erro ao buscar histórico"), 500

# ======================================================
# ERROR HANDLERS
# ======================================================
@app.errorhandler(404)
def not_found(error):
    return jsonify(error="Rota não encontrada"), 404

@app.errorhandler(429)
def ratelimit_handler(e):
    return jsonify(error="Muitas requisições"), 429

@app.errorhandler(500)
def internal_error(error):
    logger.error(f"Erro interno: {error}", exc_info=True)
    return jsonify(error="Erro interno"), 500

@jwt.expired_token_loader
def expired_token_callback(jwt_header, jwt_payload):
    return jsonify(error="Token expirado"), 401

@jwt.invalid_token_loader
def invalid_token_callback(error):
    return jsonify(error="Token inválido"), 401

@jwt.unauthorized_loader
def missing_token_callback(error):
    return jsonify(error="Token ausente"), 401

# ======================================================
# ENTRYPOINT
# ======================================================
if __name__ == "__main__":
    app.run(debug=False, host="0.0.0.0", port=5000)
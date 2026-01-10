# app.py
import os
import sqlite3
import logging
from datetime import timedelta, datetime, timezone
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
from autoai import gerar_resposta
from vision_ai import analisar_imagem

# ======================================================
# LOGGING
# ======================================================
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ======================================================
# CONFIG
# ======================================================
load_dotenv()

# Validar variáveis de ambiente críticas
required_env = ["JWT_SECRET_KEY", "GEMINI_API_KEY"]
missing_env = [var for var in required_env if not os.getenv(var)]
if missing_env:
    logger.error(f"Variáveis de ambiente faltando: {missing_env}")
    raise ValueError(f"Variáveis de ambiente obrigatórias não encontradas: {missing_env}")

app = Flask(__name__)
app.config.update(
    JWT_SECRET_KEY=os.getenv("JWT_SECRET_KEY"),
    JWT_ACCESS_TOKEN_EXPIRES=timedelta(hours=24),
    JWT_TOKEN_LOCATION=['headers'],
    JWT_HEADER_NAME='Authorization',
    JWT_HEADER_TYPE='Bearer'
)

jwt = JWTManager(app)
logger.info(f"JWT configurado com sucesso")

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

DATABASE = "database.db"

# ======================================================
# DATABASE
# ======================================================
def get_db():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Inicializa banco de dados com tabelas e índices"""
    try:
        with get_db() as db:
            # Tabela de usuários
            db.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    nome TEXT NOT NULL,
                    email TEXT UNIQUE NOT NULL,
                    password TEXT NOT NULL,
                    data_criacao TEXT NOT NULL
                )
            """)
            
            # Tabela de chat/histórico
            db.execute("""
                CREATE TABLE IF NOT EXISTS chats (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    categoria TEXT DEFAULT 'geral',
                    mensagem_usuario TEXT NOT NULL,
                    resposta_ia TEXT NOT NULL,
                    tokens_usados INTEGER DEFAULT 0,
                    data_criacao TEXT NOT NULL,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                )
            """)
            
            # Criar índices
            db.execute("CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)")
            db.execute("CREATE INDEX IF NOT EXISTS idx_chats_user_id ON chats(user_id)")
            db.execute("CREATE INDEX IF NOT EXISTS idx_chats_data ON chats(data_criacao)")
            
            db.commit()
            logger.info("✓ Banco de dados inicializado com sucesso")
    except Exception as e:
        logger.error(f"Erro ao inicializar banco de dados: {e}")
        raise

init_db()

# ======================================================
# HELPERS
# ======================================================
def hash_password(pwd):
    """Hash de senha com bcrypt"""
    pwd_bytes = pwd[:72].encode('utf-8')
    return bcrypt.hash(pwd_bytes)

def verify_password(pwd, hashed):
    """Verifica senha com bcrypt"""
    pwd_bytes = pwd[:72].encode('utf-8')
    try:
        return bcrypt.verify(pwd_bytes, hashed)
    except Exception as e:
        logger.error(f"Erro ao verificar senha: {e}")
        return False

def get_user_by_email(email):
    """Buscar usuário por email"""
    with get_db() as db:
        return db.execute(
            "SELECT * FROM users WHERE email = ?",
            (email,)
        ).fetchone()

def get_user_by_id(user_id):
    """Buscar usuário por ID"""
    with get_db() as db:
        return db.execute(
            "SELECT * FROM users WHERE id = ?",
            (user_id,)
        ).fetchone()

# ======================================================
# ROTAS HTML
# ======================================================
@app.route("/", methods=["GET"])
def home():
    """Página inicial"""
    try:
        return render_template("home.html")
    except Exception as e:
        logger.error(f"Erro ao carregar home.html: {e}")
        return jsonify(error="Página não encontrada"), 404

@app.route("/login", methods=["GET"])
def login_page():
    """Página de login"""
    try:
        return render_template("login.html")
    except Exception as e:
        logger.error(f"Erro ao carregar login.html: {e}")
        return jsonify(error="Página não encontrada"), 404

@app.route("/cadastro", methods=["GET"])
def cadastro_page():
    """Página de cadastro"""
    try:
        return render_template("cadastro.html")
    except Exception as e:
        logger.error(f"Erro ao carregar cadastro.html: {e}")
        return jsonify(error="Página não encontrada"), 404

@app.route("/chat", methods=["GET"])
def chat_page():
    """Página de chat"""
    try:
        return render_template("chat.html")
    except Exception as e:
        logger.error(f"Erro ao carregar chat.html: {e}")
        return jsonify(error="Página não encontrada"), 404

@app.route("/perfil", methods=["GET"])
def perfil_page():
    """Página de perfil"""
    try:
        return render_template("perfil.html")
    except Exception as e:
        logger.error(f"Erro ao carregar perfil.html: {e}")
        return jsonify(error="Página não encontrada"), 404

# ======================================================
# AUTH
# ======================================================
@app.route("/api/cadastro", methods=["POST"])
@limiter.limit("5/minute")
def cadastro():
    """Registrar novo usuário"""
    try:
        data = request.get_json()
        if not data:
            return jsonify(error="JSON inválido"), 400
        
        nome = data.get("nome", "").strip()
        email = data.get("email", "").lower().strip()
        password = data.get("password", "").strip()
        
        # Validações
        if not nome or len(nome) < 2:
            return jsonify(error="Nome deve ter pelo menos 2 caracteres"), 400
        
        if not email or "@" not in email or "." not in email:
            return jsonify(error="Email inválido"), 400
        
        if len(password) < 6:
            return jsonify(error="Senha deve ter pelo menos 6 caracteres"), 400
        
        if len(password) > 72:
            return jsonify(error="Senha não pode ter mais de 72 caracteres"), 400
        
        # Verificar email duplicado
        if get_user_by_email(email):
            return jsonify(error="Email já cadastrado"), 409
        
        # Inserir novo usuário
        with get_db() as db:
            db.execute(
                "INSERT INTO users (nome, email, password, data_criacao) VALUES (?, ?, ?, ?)",
                (nome, email, hash_password(password), datetime.now(timezone.utc).isoformat())
            )
            db.commit()
        
        logger.info(f"✓ Novo usuário cadastrado: {email}")
        return jsonify(success=True, message="Cadastro realizado com sucesso"), 201
    
    except Exception as e:
        logger.error(f"Erro ao cadastrar usuário: {e}", exc_info=True)
        return jsonify(error="Erro ao processar cadastro"), 500

@app.route("/api/login", methods=["POST"])
@limiter.limit("10/minute")
def login():
    """Fazer login de usuário"""
    try:
        data = request.get_json()
        if not data:
            return jsonify(error="JSON inválido"), 400
        
        email = data.get("email", "").lower().strip()
        password = data.get("password", "")
        
        if not email or not password:
            return jsonify(error="Email e senha são obrigatórios"), 400
        
        # Buscar usuário
        user = get_user_by_email(email)
        if not user:
            logger.warning(f"Login falhou: usuário não encontrado - {email}")
            return jsonify(error="Email ou senha incorretos"), 401
        
        # Verificar senha
        if not verify_password(password, user["password"]):
            logger.warning(f"Login falhou: senha incorreta para {email}")
            return jsonify(error="Email ou senha incorretos"), 401
        
        # Criar token JWT
        access_token = create_access_token(
            identity=str(user["id"]),
            additional_claims={"email": email}
        )
        
        logger.info(f"✓ Login bem-sucedido: {email}")
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
    """Obter informações do usuário autenticado"""
    try:
        user_id = int(get_jwt_identity())
        user = get_user_by_id(user_id)
        
        if not user:
            return jsonify(error="Usuário não encontrado"), 404
        
        return jsonify({
            "id": user["id"],
            "nome": user["nome"],
            "email": user["email"],
            "data_criacao": user["data_criacao"]
        }), 200
    
    except Exception as e:
        logger.error(f"Erro ao buscar informações do usuário: {e}", exc_info=True)
        return jsonify(error="Erro ao buscar informações"), 500

@app.route("/api/verify-token", methods=["GET"])
@jwt_required()
def verify_token():
    """Verificar se token é válido"""
    try:
        user_id = int(get_jwt_identity())
        logger.info(f"✓ Token verificado para user: {user_id}")
        return jsonify(success=True, user_id=user_id), 200
    except Exception as e:
        logger.error(f"Erro ao verificar token: {e}")
        return jsonify(success=False, error=str(e)), 401

@app.route("/api/logout", methods=["POST"])
@jwt_required()
def logout():
    """Fazer logout"""
    try:
        user_id = int(get_jwt_identity())
        logger.info(f"✓ Logout: usuário {user_id}")
        return jsonify(success=True, message="Logout realizado com sucesso"), 200
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
    """Enviar mensagem e receber resposta da IA"""
    try:
        user_id = int(get_jwt_identity())
        data = request.get_json()
        
        if not data:
            logger.error("JSON vazio ou inválido")
            return jsonify(error="JSON inválido"), 400
        
        message = data.get("message", "").strip()
        categoria = data.get("category", "geral").lower()
        image_b64 = data.get("image")  # Base64 da imagem
        
        logger.info(f"Chat request - user_id: {user_id}, categoria: {categoria}, tem_imagem: {bool(image_b64)}")
        
        # Validar se tem mensagem ou imagem
        if not message and not image_b64:
            logger.warning("Mensagem e imagem vazias")
            return jsonify(error="Envie uma mensagem ou uma imagem"), 400
        
        # Validar tamanho da mensagem
        if message and len(message) > 2000:
            return jsonify(error="Mensagem não pode exceder 2000 caracteres"), 400
        
        # Se tem imagem, usar análise de imagem
        if image_b64:
            logger.info(f"Processando imagem para usuário {user_id}")
            try:
                # Remover prefixo data:image/...;base64, se existir
                if ',' in image_b64:
                    image_b64 = image_b64.split(',')[1]
                
                resposta = analisar_imagem(image_b64, message or "Analise esta imagem")
                tipo_resposta = "analise_imagem"
            except Exception as img_error:
                logger.error(f"Erro ao analisar imagem: {img_error}", exc_info=True)
                return jsonify(error="Erro ao processar imagem"), 500
        else:
            # Chat normal
            logger.info(f"Processando mensagem de texto para usuário {user_id}")
            try:
                resposta = gerar_resposta(message, user_id, categoria)
                tipo_resposta = "chat"
            except Exception as chat_error:
                logger.error(f"Erro ao gerar resposta: {chat_error}", exc_info=True)
                return jsonify(error="Erro ao processar mensagem"), 500
        
        # Salvar no histórico
        try:
            with get_db() as db:
                db.execute(
                    """INSERT INTO chats (user_id, categoria, mensagem_usuario, resposta_ia, data_criacao) 
                       VALUES (?, ?, ?, ?, ?)""",
                    (user_id, categoria, message or "[Imagem enviada]", resposta, 
                     datetime.now(timezone.utc).isoformat())
                )
                db.commit()
                logger.info(f"✓ Chat salvo no banco para usuário {user_id}")
        except Exception as db_error:
            logger.error(f"Erro ao salvar chat: {db_error}")
            # Continua mesmo se não salvar
        
        logger.info(f"✓ Chat processado com sucesso para usuário {user_id}")
        logger.info(f"📊 Tamanho da resposta: {len(resposta)} caracteres")
        logger.info(f"📝 Primeiros 200 chars da resposta: {resposta[:200]}...")
        
        # Retornar resposta (suporta ambos os formatos)
        return jsonify(
            success=True, 
            response=resposta,
            text=resposta,  # Compatibilidade com formato antigo
            tipo=tipo_resposta
        ), 200
    
    except Exception as e:
        logger.error(f"Erro ao processar chat: {e}", exc_info=True)
        return jsonify(error="Erro ao processar sua mensagem"), 500

@app.route("/api/chat/history", methods=["GET"])
@jwt_required()
def chat_history():
    """Obter histórico de mensagens"""
    try:
        user_id = int(get_jwt_identity())
        limit = request.args.get('limit', 20, type=int)
        
        with get_db() as db:
            chats = db.execute(
                """SELECT mensagem_usuario, resposta_ia, categoria, data_criacao 
                   FROM chats WHERE user_id = ? 
                   ORDER BY data_criacao DESC LIMIT ?""",
                (user_id, min(limit, 100))
            ).fetchall()
        
        return jsonify(chats=[dict(c) for c in reversed(list(chats))]), 200
    
    except Exception as e:
        logger.error(f"Erro ao buscar histórico: {e}")
        return jsonify(error="Erro ao buscar histórico"), 500

# ======================================================
# IMAGE ANALYSIS (Legacy endpoint - mantido para compatibilidade)
# ======================================================
@app.route("/api/analyze_image", methods=["POST"])
@jwt_required()
@limiter.limit("5/minute")
def analyze_image():
    """Analisar imagem com IA (endpoint legacy)"""
    try:
        user_id = int(get_jwt_identity())
        data = request.get_json()
        
        if not data:
            return jsonify(error="JSON inválido"), 400
        
        image_b64 = data.get("image", "").strip()
        question = data.get("question", "").strip()
        
        if not image_b64:
            return jsonify(error="Imagem é obrigatória"), 400
        
        # Remover prefixo data:image/...;base64, se existir
        if ',' in image_b64:
            image_b64 = image_b64.split(',')[1]
        
        logger.info(f"Análise: processando imagem do usuário {user_id}")
        resultado = analisar_imagem(image_b64, question or "Analise esta imagem")
        
        # Salvar no histórico
        try:
            with get_db() as db:
                db.execute(
                    """INSERT INTO chats (user_id, categoria, mensagem_usuario, resposta_ia, data_criacao) 
                       VALUES (?, ?, ?, ?, ?)""",
                    (user_id, "analise", question or "[Análise de imagem]", resultado, 
                     datetime.now(timezone.utc).isoformat())
                )
                db.commit()
        except Exception as db_error:
            logger.error(f"Erro ao salvar análise: {db_error}")
        
        logger.info(f"✓ Imagem analisada para usuário {user_id}")
        return jsonify(success=True, analysis=resultado), 200
    
    except Exception as e:
        logger.error(f"Erro ao analisar imagem: {e}", exc_info=True)
        return jsonify(error="Erro ao analisar imagem"), 500

# ======================================================
# ERROR HANDLERS
# ======================================================
@app.errorhandler(404)
def not_found(error):
    return jsonify(error="Rota não encontrada"), 404

@app.errorhandler(429)
def ratelimit_handler(e):
    logger.warning(f"Rate limit excedido: {request.remote_addr}")
    return jsonify(error="Muitas requisições. Tente novamente mais tarde"), 429

@app.errorhandler(500)
def internal_error(error):
    logger.error(f"Erro interno: {error}", exc_info=True)
    return jsonify(error="Erro interno do servidor"), 500

@jwt.expired_token_loader
def expired_token_callback(jwt_header, jwt_payload):
    logger.warning("Token expirado")
    return jsonify(error="Token expirado", code="token_expired"), 401

@jwt.invalid_token_loader
def invalid_token_callback(error):
    logger.warning(f"Token inválido: {error}")
    return jsonify(error="Token inválido", code="invalid_token"), 401

@jwt.unauthorized_loader
def missing_token_callback(error):
    logger.warning(f"Token ausente: {error}")
    return jsonify(error="Token de autenticação ausente", code="missing_token"), 401

# ======================================================
# ENTRYPOINT
# ======================================================
if __name__ == "__main__":
    app.run(debug=False, host="0.0.0.0", port=5000)
# app.py
import os
import sqlite3
import logging
from datetime import timedelta, datetime, timezone
from flask import Flask, request, jsonify, render_template, send_from_directory
from flask_cors import CORS
from flask_jwt_extended import (
    JWTManager, create_access_token,
    jwt_required, get_jwt_identity
)
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from passlib.hash import bcrypt
from dotenv import load_dotenv
from autoai import gerar_resposta
from vision_ai import analisar_imagem

# Importar exceções JWT
from flask_jwt_extended.exceptions import JWTExtendedException

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
    JWT_ACCESS_TOKEN_EXPIRES=timedelta(hours=24)
)

jwt = JWTManager(app)

logger.info(f"JWT_SECRET_KEY carregado: {bool(app.config['JWT_SECRET_KEY'])}")
logger.info(f"JWT_SECRET_KEY primeiros 10 chars: {app.config['JWT_SECRET_KEY'][:10] if app.config['JWT_SECRET_KEY'] else 'NÃO CONFIGURADO'}")

CORS(app)
limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"]
)

DATABASE = "database.db"
logger.info(f"Banco de dados: {DATABASE}")

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
            
            # Tabela de sessões/tokens
            db.execute("""
                CREATE TABLE IF NOT EXISTS sessoes (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    token TEXT UNIQUE NOT NULL,
                    data_criacao TEXT NOT NULL,
                    data_expiracao TEXT NOT NULL,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                )
            """)
            
            # Criar índices para melhor performance
            db.execute("""
                CREATE INDEX IF NOT EXISTS idx_users_email 
                ON users(email)
            """)
            
            db.execute("""
                CREATE INDEX IF NOT EXISTS idx_chats_user_id 
                ON chats(user_id)
            """)
            
            db.execute("""
                CREATE INDEX IF NOT EXISTS idx_chats_data 
                ON chats(data_criacao)
            """)
            
            db.execute("""
                CREATE INDEX IF NOT EXISTS idx_sessoes_user_id 
                ON sessoes(user_id)
            """)
            
            db.execute("""
                CREATE INDEX IF NOT EXISTS idx_sessoes_token 
                ON sessoes(token)
            """)
            
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
    """Hash de senha com limite de 72 bytes (limitação do bcrypt)"""
    # bcrypt limita a 72 bytes
    pwd_truncated = pwd[:72].encode('utf-8')[:72].decode('utf-8')
    return bcrypt.hash(pwd_truncated)

def verify_password(pwd, hashed):
    """Verifica senha com limite de 72 bytes"""
    pwd_truncated = pwd[:72].encode('utf-8')[:72].decode('utf-8')
    return bcrypt.verify(pwd_truncated, hashed)

def get_user(email):
    with get_db() as db:
        return db.execute(
            "SELECT * FROM users WHERE email = ?",
            (email,)
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
        data = request.json
        nome = data.get("nome", "").strip()
        email = data.get("email", "").lower().strip()
        password = data.get("password", "").strip()

        # Validações
        if not nome or len(nome) < 2:
            logger.warning(f"Cadastro falhou: nome inválido")
            return jsonify(error="Nome deve ter pelo menos 2 caracteres"), 400
        
        if not email or "@" not in email:
            logger.warning(f"Cadastro falhou: email inválido")
            return jsonify(error="Email inválido"), 400
        
        if len(password) < 6:
            logger.warning(f"Cadastro falhou: senha muito curta")
            return jsonify(error="Senha deve ter pelo menos 6 caracteres"), 400
        
        if len(password) > 72:
            logger.warning(f"Cadastro falhou: senha muito longa")
            return jsonify(error="Senha não pode ter mais de 72 caracteres"), 400

        # Verificar email duplicado
        if get_user(email):
            logger.warning(f"Cadastro falhou: email já existe - {email}")
            return jsonify(error="Email já cadastrado"), 409

        # Inserir novo usuário
        with get_db() as db:
            db.execute(
                "INSERT INTO users VALUES (NULL, ?, ?, ?, ?)",
                (
                    nome,
                    email,
                    hash_password(password),
                    datetime.utcnow().isoformat()
                )
            )
            db.commit()
        
        logger.info(f"✓ Novo usuário cadastrado: {email}")
        return jsonify(success=True, message="Cadastro realizado com sucesso"), 201

    except Exception as e:
        logger.error(f"Erro ao cadastrar usuário: {e}", exc_info=True)
        return jsonify(error="Erro ao processar cadastro"), 500

@app.route("/api/login", methods=["POST"])
@limiter.limit("5/minute")
def login():
    """Fazer login de usuário"""
    try:
        data = request.json
        email = data.get("email", "").lower().strip()
        password = data.get("password", "")

        if not email or not password:
            logger.warning(f"Login falhou: credenciais ausentes")
            return jsonify(error="Email e senha são obrigatórios"), 400

        # Buscar usuário
        user = get_user(email)
        if not user or not verify_password(password, user["password"]):
            logger.warning(f"Login falhou: credenciais inválidas para {email}")
            return jsonify(error="Email ou senha incorretos"), 401

        # Criar token JWT (identity deve ser string)
        token = create_access_token(identity=str(user["id"]))
        
        # Salvar token na tabela de sessões
        try:
            data_criacao = datetime.utcnow().isoformat()
            data_expiracao = (datetime.utcnow() + timedelta(hours=24)).isoformat()
            
            with get_db() as db:
                db.execute(
                    """INSERT INTO sessoes 
                    (user_id, token, data_criacao, data_expiracao) 
                    VALUES (?, ?, ?, ?)""",
                    (user["id"], token, data_criacao, data_expiracao)
                )
                db.commit()
            logger.info(f"✓ Sessão salva no banco para usuário: {email}")
        except Exception as db_error:
            logger.error(f"Erro ao salvar sessão no banco: {db_error}")
            # Continua mesmo se não conseguir salvar a sessão
        
        logger.info(f"✓ Login bem-sucedido: {email}")
        return jsonify(
            access_token=token,
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
        user_id = int(get_jwt_identity())  # Converter de volta para int
        logger.info(f"✓ JWT válido - user_id: {user_id}")
        with get_db() as db:
            user = db.execute(
                "SELECT id, nome, email, data_criacao FROM users WHERE id = ?",
                (user_id,)
            ).fetchone()
        
        if not user:
            logger.warning(f"Usuário não encontrado: {user_id}")
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

@app.route("/api/debug-headers", methods=["GET"])
def debug_headers():
    """Rota de debug que mostra exatamente o que está chegando"""
    auth_header = request.headers.get('Authorization', 'AUSENTE')
    logger.error(f"DEBUG - Authorization Header: {auth_header}")
    logger.error(f"DEBUG - Todos os headers: {dict(request.headers)}")
    return jsonify({
        "authorization_header": auth_header,
        "all_headers": dict(request.headers)
    }), 200

@app.route("/api/verify-token", methods=["GET"])
@jwt_required()
def verify_token():
    """Verificar se token é válido (para debug)"""
    try:
        logger.debug(f"Headers recebidos: {dict(request.headers)}")
        user_id = int(get_jwt_identity())  # Converter de volta para int
        logger.info(f"✓ Token verificado para user: {user_id}")
        return jsonify(success=True, user_id=user_id, message="Token válido"), 200
    except Exception as e:
        logger.error(f"Erro ao verificar token: {e}", exc_info=True)
        logger.error(f"JWT_SECRET_KEY configurado: {bool(os.getenv('JWT_SECRET_KEY'))}")
        return jsonify(success=False, error=str(e)), 401

@app.route("/api/logout", methods=["POST"])
@jwt_required()
def logout():
    """Fazer logout (invalidar token)"""
    try:
        user_id = int(get_jwt_identity())  # Converter de volta para int
        logger.info(f"✓ Logout: usuário {user_id}")
        return jsonify(success=True, message="Logout realizado com sucesso"), 200
    
    except Exception as e:
        logger.error(f"Erro ao fazer logout: {e}", exc_info=True)
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

        
        user_id = int(get_jwt_identity())  # Converter de volta para int
        logger.info(f"✓ Chat: usuário autenticado - {user_id}")
        
        data = request.json
        if not data:
            logger.warning(f"Chat: JSON vazio")
            return jsonify(error="JSON vazio"), 400
        
        message = data.get("message", "").strip()
        categoria = data.get("category", "geral").lower()

        logger.info(f"Chat: mensagem='{message[:50]}...', categoria={categoria}")

        # Validações
        if not message:
            logger.warning(f"Chat: mensagem vazia do usuário {user_id}")
            return jsonify(error="Mensagem não pode estar vazia"), 400
        
        if len(message) > 2000:
            logger.warning(f"Chat: mensagem muito longa do usuário {user_id}")
            return jsonify(error="Mensagem não pode exceder 2000 caracteres"), 400

        # Gerar resposta
        logger.info(f"Chat: processando mensagem do usuário {user_id} (categoria: {categoria})")
        resposta = gerar_resposta(message, user_id, categoria)

        # Salvar chat no histórico
        try:
            with get_db() as db:
                db.execute(
                    """INSERT INTO chats 
                    (user_id, categoria, mensagem_usuario, resposta_ia, data_criacao) 
                    VALUES (?, ?, ?, ?, ?)""",
                    (user_id, categoria, message, resposta, datetime.now(timezone.utc).isoformat())
                )
                db.commit()
        except Exception as db_error:
            logger.error(f"Erro ao salvar chat no banco: {db_error}")
            # Continua mesmo se não conseguir salvar
        
        logger.info(f"✓ Chat processado com sucesso para usuário {user_id}")
        return jsonify(success=True, response=resposta), 200

    except Exception as e:
        logger.error(f"Erro ao processar chat: {e}", exc_info=True)
        return jsonify(error="Erro ao processar sua mensagem"), 500

# ======================================================
# IMAGE ANALYSIS
# ======================================================

@app.route("/api/analyze_image", methods=["POST"])
@jwt_required()
@limiter.limit("5/minute")
def analyze_image():
    """Analisar imagem com IA"""
    try:
        user_id = int(get_jwt_identity())  # Converter de volta para int
        data = request.json
        image_b64 = data.get("image", "").strip()
        question = data.get("question", "").strip()

        # Validações
        if not image_b64:
            logger.warning(f"Análise: imagem ausente do usuário {user_id}")
            return jsonify(error="Imagem é obrigatória"), 400

        logger.info(f"Análise: processando imagem do usuário {user_id}")
        resultado = analisar_imagem(image_b64, question)

        # Salvar no histórico
        try:
            with get_db() as db:
                db.execute(
                    """INSERT INTO chats 
                    (user_id, categoria, mensagem_usuario, resposta_ia, data_criacao) 
                    VALUES (?, ?, ?, ?, ?)""",
                    (user_id, "analise", question or "[Análise de imagem]", resultado, datetime.now(timezone.utc).isoformat())
                )
                db.commit()
        except Exception as db_error:
            logger.error(f"Erro ao salvar análise no banco: {db_error}")

        logger.info(f"✓ Imagem analisada com sucesso para usuário {user_id}")
        return jsonify(success=True, analysis=resultado), 200

    except Exception as e:
        logger.error(f"Erro ao analisar imagem: {e}", exc_info=True)
        return jsonify(error="Erro ao analisar imagem"), 500

# ======================================================
# ERROR HANDLERS
# ======================================================

@app.errorhandler(404)
def not_found(error):
    logger.warning(f"404 - Rota não encontrada: {request.path}")
    return jsonify(error="Rota não encontrada"), 404

@app.errorhandler(429)
def ratelimit_handler(e):
    logger.warning(f"Rate limit excedido: {request.remote_addr}")
    return jsonify(error="Muitas requisições. Tente novamente mais tarde"), 429

@app.errorhandler(500)
def internal_error(error):
    logger.error(f"Erro interno do servidor: {error}", exc_info=True)
    return jsonify(error="Erro interno do servidor"), 500

# Handlers JWT
@jwt.additional_claims_loader
def add_claims_to_jwt(identity):
    # identity já é uma string neste ponto
    return {}



@app.errorhandler(JWTExtendedException)
def handle_jwt_error(e):
    logger.error(f"❌ Erro JWT completo: {e}", exc_info=True)
    logger.error(f"Tipo exato: {type(e).__name__}")
    logger.error(f"Args: {e.args}")
    logger.error(f"Headers recebidos: {dict(request.headers)}")
    logger.error(f"Authorization: {request.headers.get('Authorization', 'NÃO ENVIADO')}")
    return jsonify(error=f"Erro JWT: {str(e)}", error_type=type(e).__name__), 401

@app.errorhandler(Exception)
def handle_generic_error(e):
    """Capturar TODOS os erros para ver o que está acontecendo"""
    if isinstance(e, JWTExtendedException):
        return handle_jwt_error(e)
    
    logger.error(f"⚠️ ERRO NÃO TRATADO: {type(e).__name__}: {e}", exc_info=True)
    
    # Se for erro 422, logar detalhes
    if hasattr(e, 'code') and e.code == 422:
        logger.error(f"❌ Erro 422 detectado")
        logger.error(f"Path: {request.path}")
        logger.error(f"Headers: {dict(request.headers)}")
    
    return None  # Deixar Flask lidar com o erro padrão

# ======================================================
# ENTRYPOINT
# ======================================================

if __name__ == "__main__":
    app.run(debug=False, host="0.0.0.0", port=5000)

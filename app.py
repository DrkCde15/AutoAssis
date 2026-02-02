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
from report_generator import criar_relatorio_pdf # Import do Gerador de PDF premium

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
    JWT_REFRESH_TOKEN_EXPIRES=timedelta(days=30),
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
                    is_premium BOOLEAN DEFAULT FALSE,
                    data_criacao DATETIME NOT NULL,
                    INDEX idx_email (email)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            """)
            
            # --- MIGRAÇÃO AUTOMÁTICA (Para bancos já criados) ---
            # Verifica se a coluna is_premium existe, se não, cria.
            cursor.execute("SHOW COLUMNS FROM users LIKE 'is_premium'")
            if not cursor.fetchone():
                cursor.execute("ALTER TABLE users ADD COLUMN is_premium BOOLEAN DEFAULT FALSE")
                logger.info("🔧 Migração: Coluna 'is_premium' adicionada com sucesso.")
            # -----------------------------------------------------

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

# ======================================================
# LÓGICA DE TRIAL (30 DIAS)
# ======================================================
def is_trial_expired(user):
    """Retorna True se o usuário NÃO é Premium e passou de 30 dias."""
    if user.get("is_premium"):
        return False
        
    # Se data_criacao for string (de query manual), converte
    created_at = user["data_criacao"]
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at)
        
    # Garante fuso horário aware
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)
        
    now = datetime.now(timezone.utc)
    delta = now - created_at
    return delta.days >= 30

@app.route("/api/pay/mock", methods=["POST"])
@jwt_required()
def mock_payment():
    """Simula pagamento realizado via PIX"""
    user_id = int(get_jwt_identity())
    try:
        with get_db() as (cursor, conn):
            cursor.execute("UPDATE users SET is_premium = TRUE WHERE id = %s", (user_id,))
            return jsonify({
                "success": True, 
                "message": "Pagamento confirmado! Você agora é Premium 🌟"
            }), 200
    except Exception as e:
        logger.error(f"Erro no pagamento mock: {e}")
        return jsonify(error="Erro ao processar pagamento"), 500

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
                "INSERT INTO users (nome, email, password, is_premium, data_criacao) VALUES (%s, %s, %s, FALSE, %s)",
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
            refresh_token = create_refresh_token(identity=str(user["id"]))
            
            return jsonify(
                access_token=token, 
                refresh_token=refresh_token,
                user={
                    "nome": user["nome"], 
                    "email": user["email"],
                    "is_premium": bool(user["is_premium"]),
                    "trial_expired": is_trial_expired(user)
                }
            ), 200
    except Exception as e:
        logger.error(f"Erro no login: {e}")
        return jsonify(error="Erro interno"), 500

@app.route("/api/refresh", methods=["POST"])
@jwt_required(refresh=True)
def refresh():
    """Renova Access Token. Se for Premium, renova também o Refresh Token (Sliding Expiration)."""
    try:
        current_user_id = get_jwt_identity()
        new_access_token = create_access_token(identity=current_user_id)
        
        response_data = {"access_token": new_access_token}

        # Verifica se o usuário é Premium para aplicar renovação infinita
        with get_db() as (cursor, conn):
            cursor.execute("SELECT is_premium FROM users WHERE id = %s", (current_user_id,))
            user = cursor.fetchone()
            
            if user and user.get('is_premium'):
                # Sliding Expiration: Gera um NOVO Refresh Token de +30 dias
                new_refresh_token = create_refresh_token(identity=current_user_id)
                response_data["refresh_token"] = new_refresh_token
                
        return jsonify(response_data), 200
        
    except Exception as e:
        logger.error(f"Erro no refresh: {e}")
        return jsonify(error="Erro ao renovar token"), 401

@app.route("/api/report", methods=["POST"])
@jwt_required()
def generate_report():
    """Endpoint Premium: Gera relatório PDF da última análise"""
    user_id = int(get_jwt_identity())
    data = request.get_json()
    conteudo_analise = data.get("text", "")

    try:
        with get_db() as (cursor, conn):
            # 1. Verifica se é Premium
            cursor.execute("SELECT nome, email, is_premium FROM users WHERE id = %s", (user_id,))
            user = cursor.fetchone()
            
            if not user or not user['is_premium']:
                return jsonify(error="Recurso exclusivo para usuários Premium 🌟"), 403

            # 2. Gera o Relatório
            filename = f"report_{user_id}_{uuid.uuid4().hex[:8]}.pdf"
            filepath = os.path.join("static", "reports", filename)
            
            sucesso = criar_relatorio_pdf(user, conteudo_analise, filepath)
            
            if sucesso:
                return jsonify({
                    "url": f"/static/reports/{filename}",
                    "message": "Relatório gerado com sucesso!"
                }), 200
            else:
                return jsonify(error="Erro na geração do arquivo"), 500

    except Exception as e:
        logger.error(f"Erro ao gerar relatório: {e}")
        return jsonify(error="Erro interno no servidor"), 500

@app.route("/api/user", methods=["GET"])
@jwt_required()
def get_profile():
    """Retorna dados do perfil do utilizador logado"""
    user_id = int(get_jwt_identity())
    try:
        with get_db() as (cursor, conn):
            # Buscar dados do utilizador
            cursor.execute("SELECT nome, email, is_premium, data_criacao FROM users WHERE id = %s", (user_id,))
            user = cursor.fetchone()
            
            if not user:
                return jsonify(error="Utilizador não encontrado"), 404
            
            # Buscar estatísticas (total de consultas realizadas)
            cursor.execute("SELECT COUNT(*) as total FROM chats WHERE user_id = %s", (user_id,))
            stats = cursor.fetchone()

            return jsonify({
                "nome": user["nome"],
                "email": user["email"],
                "is_premium": bool(user["is_premium"]),
                "trial_expired": is_trial_expired(user),
                "data_criacao": user["data_criacao"].strftime("%d/%m/%Y"),
                "total_consultas": stats["total"] if stats else 0
            }), 200
    except Exception as e:
        logger.error(f"Erro ao buscar perfil: {e}")
        return jsonify(error="Erro ao processar dados do perfil"), 500

@app.route("/api/chat", methods=["POST"])
@jwt_required()
@limiter.limit("20 per minute")
def chat():
    user_id = int(get_jwt_identity())
    data = request.get_json()
    msg = data.get("message", "").strip()
    img_b64 = data.get("image") # Base64 opcional
    category = data.get("category", "geral")

    try:
        with get_db() as (cursor, conn):
            # Verifica usuário e TRIAL
            cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))
            user = cursor.fetchone()
            
            if not user:
                return jsonify(error="Usuário não encontrado"), 404
                
            if is_trial_expired(user):
                return jsonify({
                    "error": "TRIAL_EXPIRED",
                    "message": "Seu período de teste de 30 dias acabou."
                }), 402

            # 1. Pipeline de Visão (Se houver imagem)
            if img_b64:
                logger.info(f"📸 Análise visual requisitada pelo user {user_id}")
                timestamp = int(datetime.now().timestamp())
                temp_filename = f"temp_user_{user_id}_{timestamp}.png"
                resposta = analisar_imagem(img_b64, msg or "Analise este veículo", filename=temp_filename)
            
            # 2. Pipeline de Texto (NOG padrão)
            else:
                if not msg:
                    return jsonify(error="Conteúdo vazio"), 400
                    
                # Busca contexto (últimas 5 msgs)
                cursor.execute("""
                    SELECT mensagem_usuario, resposta_ia 
                    FROM chats 
                    WHERE user_id = %s 
                    ORDER BY data_criacao DESC LIMIT 5
                """, (user_id,))
                historico = cursor.fetchall()
                
                # Formata histórico p/ NOG
                contexto_str = "\n".join([f"User: {h['mensagem_usuario']}\nNOG: {h['resposta_ia']}" for h in reversed(historico)])
                resposta = gerar_resposta(msg, contexto_str)

            # Salva no histórico
            cursor.execute(
                "INSERT INTO chats (user_id, categoria, mensagem_usuario, resposta_ia, data_criacao) VALUES (%s, %s, %s, %s, %s)",
                (user_id, category, msg or "[Imagem]", resposta, datetime.now(timezone.utc))
            )
            
            return jsonify(response=resposta)

    except Exception as e:
        logger.error(f"Erro no chat: {e}")
        return jsonify(error=f"Erro interno: {str(e)}"), 500

@app.route("/api/user", methods=["PUT"])
@jwt_required()
def update_profile():
    """Atualiza dados do perfil (Nome, Email)"""
    user_id = int(get_jwt_identity())
    data = request.get_json()
    novo_nome = data.get("nome")
    novo_email = data.get("email")
    
    if not novo_nome or not novo_email:
        return jsonify(error="Nome e Email são obrigatórios"), 400
        
    try:
        with get_db() as (cursor, conn):
            cursor.execute("UPDATE users SET nome = %s, email = %s WHERE id = %s", (novo_nome, novo_email, user_id))
            return jsonify(message="Perfil atualizado com sucesso!"), 200
    except Exception as e:
        logger.error(f"Erro update perfil: {e}")
        return jsonify(error="Erro ao atualizar perfil"), 500

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
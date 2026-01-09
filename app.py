from flask import Flask, render_template, request, jsonify, session
from flask_cors import CORS
from langchain_google_genai import ChatGoogleGenerativeAI
from PIL import Image
import io
import base64
import os
from dotenv import load_dotenv
from datetime import datetime
import hashlib
import sqlite3

load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv('SECRET_KEY', 'sua-chave-secreta-aqui')
CORS(app)

# Configure Gemini API
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY', 'YOUR_API_KEY_HERE')
try:
    model_text = ChatGoogleGenerativeAI(api_key=GEMINI_API_KEY, model='gemini-2.5-flash')
    print("✓ Modelo de texto (gemini-2.5-flash) inicializado com sucesso")
except Exception as e:
    print(f"✗ Erro ao inicializar modelo de texto: {e}")
    model_text = None

try:
    model_vision = ChatGoogleGenerativeAI(api_key=GEMINI_API_KEY, model='gemini-2.0-flash')
    print("✓ Modelo de visão (gemini-2.0-flash) inicializado com sucesso")
except Exception as e:
    print(f"✗ Erro ao inicializar modelo de visão: {e}")
    model_vision = None

# Configuração do banco de dados SQLite
DATABASE = 'database.db'

def get_db_connection():
    """Cria e retorna uma conexão com o banco de dados SQLite"""
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

def init_database():
    """Inicializa o banco de dados criando a tabela de usuários se não existir"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            data_criacao TEXT NOT NULL
        )
    ''')
    
    conn.commit()
    conn.close()

def load_users():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM users')
        rows = cursor.fetchall()
        conn.close()
        
        users = {}
        for row in rows:
            users[row['email']] = {
                'id': row['id'],
                'nome': row['nome'],
                'email': row['email'],
                'password': row['password'],
                'dataCriacao': row['data_criacao']
            }
        return users
    except Exception as e:
        print(f"Erro ao carregar usuários: {e}")
        return {}

def save_user(nome, email, password):
    """Salva um novo usuário no banco de dados"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        data_criacao = datetime.now().strftime('%d/%m/%Y')
        
        cursor.execute('''
            INSERT INTO users (nome, email, password, data_criacao)
            VALUES (?, ?, ?, ?)
        ''', (nome, email, password, data_criacao))
        
        conn.commit()
        conn.close()
        return True
    except sqlite3.IntegrityError:
        print(f"Email {email} já existe")
        return False
    except Exception as e:
        print(f"Erro ao salvar usuário: {e}")
        return False

def get_user(email):
    """Obtém um usuário pelo email"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM users WHERE email = ?', (email,))
        row = cursor.fetchone()
        conn.close()
        
        if row:
            return {
                'id': row['id'],
                'nome': row['nome'],
                'email': row['email'],
                'password': row['password'],
                'dataCriacao': row['data_criacao']
            }
        return None
    except Exception as e:
        print(f"Erro ao buscar usuário: {e}")
        return None

def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

# Inicializar banco de dados na inicialização da aplicação
init_database()

# Prompts especializados
PROMPTS = {
    'compra': """Você é um consultor especializado em compra de veículos no Brasil. 
    Analise a solicitação do usuário e forneça recomendações detalhadas sobre:
    - Modelos adequados ao perfil e orçamento
    - Comparação de custo-benefício
    - Pontos de atenção na compra
    - Documentação necessária
    - Faixa de preço atual no mercado brasileiro
    - Custos de manutenção e seguro
    Seja específico e use dados do mercado brasileiro.""",
    
    'pecas': """Você é um especialista em peças automotivas.
    Ajude o usuário com informações sobre:
    - Identificação de peças necessárias
    - Qualidade e marcas recomendadas no Brasil
    - Preços médios no mercado brasileiro
    - Compatibilidade com modelos
    - Dicas de manutenção preventiva
    - Diferença entre peças originais e paralelas""",
    
    'modelos': """Você é um especialista em modelos de veículos vendidos no Brasil.
    Forneça informações detalhadas sobre:
    - Especificações técnicas
    - Histórico de confiabilidade
    - Consumo de combustível (urbano e rodoviário)
    - Custo de manutenção e seguro
    - Comparação com concorrentes
    - Melhor ano/versão para comprar
    - Valor de revenda""",
    
    'analise_imagem': """Você é um especialista em análise visual de veículos e peças automotivas.
    Analise a imagem e forneça:
    - Identificação do modelo/marca/ano (se veículo)
    - Estado de conservação aparente
    - Possíveis problemas ou danos visíveis
    - Estimativa aproximada de valor (mercado brasileiro)
    - Recomendações de vistoria detalhada
    - Pontos de atenção específicos
    Seja preciso e mencione se precisa de mais ângulos para uma análise completa."""
}

@app.route('/')
def index():
    return render_template('home.html')


@app.route('/cadastro')
def page_cadastro():
    return render_template('cadastro.html')


@app.route('/login')
def page_login():
    return render_template('login.html')


@app.route('/chat')
def page_chat():
    # Se quiser forçar login antes de acessar o chat, descomente a verificação abaixo
    if 'user_id' not in session:
        return render_template('login.html')
    return render_template('chat.html')


@app.route('/perfil')
def page_perfil():
    if 'user_id' not in session:
        return render_template('login.html')
    
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM users WHERE id = ?', (session.get('user_id'),))
    row = cursor.fetchone()
    conn.close()
    
    user = None
    if row:
        user = {
            'id': row['id'],
            'nome': row['nome'],
            'email': row['email'],
            'dataCriacao': row['data_criacao']
        }
    
    return render_template('perfil.html', user=user)


@app.route('/logout')
def logout():
    session.pop('user_id', None)
    return render_template('home.html')

@app.route('/api/cadastro', methods=['POST'])
def cadastro():
    try:
        data = request.json
        nome = data.get('nome', '').strip()
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        
        if not nome or not email or not password:
            return jsonify({
                'success': False,
                'message': 'Preencha todos os campos'
            }), 400
        
        if len(password) < 6:
            return jsonify({
                'success': False,
                'message': 'A senha deve ter no mínimo 6 caracteres'
            }), 400
        
        # Verificar se email já existe
        if get_user(email) is not None:
            return jsonify({
                'success': False,
                'message': 'Email já cadastrado'
            }), 400
        
        # Salvar novo usuário
        hashed_password = hash_password(password)
        if save_user(nome, email, hashed_password):
            return jsonify({
                'success': True,
                'message': 'Usuário cadastrado com sucesso'
            })
        else:
            return jsonify({
                'success': False,
                'message': 'Erro ao cadastrar usuário'
            }), 400
        
    except Exception as e:
        print(f"Erro no cadastro: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/login', methods=['POST'])
def login():
    try:
        data = request.json
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        
        if not email or not password:
            return jsonify({
                'success': False,
                'message': 'Email e senha são obrigatórios'
            }), 400
        
        # Buscar usuário no banco
        user = get_user(email)
        
        if user is None:
            return jsonify({
                'success': False,
                'message': 'Email não encontrado'
            }), 401
        
        if user['password'] != hash_password(password):
            return jsonify({
                'success': False,
                'message': 'Senha incorreta'
            }), 401
        
        # Salvar na sessão
        session['user_id'] = user['id']
        
        # Não retornar a senha
        user_data = {
            'id': user['id'],
            'nome': user['nome'],
            'email': user['email'],
            'dataCriacao': user['dataCriacao']
        }
        
        return jsonify({
            'success': True,
            'user': user_data
        })
    except Exception as e:
        print(f"Erro no login: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/chat', methods=['POST'])
def chat():
    try:
        data = request.json
        user_message = data.get('message', '')
        category = data.get('category', 'geral')
        
        if not user_message:
            return jsonify({
                'success': False,
                'error': 'Mensagem não pode estar vazia'
            }), 400
        
        system_prompt = PROMPTS.get(category, 'Você é um assistente especializado em consultoria automotiva.')
        full_prompt = f"{system_prompt}\n\nPergunta do usuário: {user_message}"
        
        if model_text is None:
            return jsonify({
                'success': False,
                'error': 'Modelo de texto não está inicializado. Verifique a API key do Gemini.'
            }), 500

        # Usar `invoke` ao invés de `predict` para compatibilidade com LangChain
        try:
            resp = model_text.invoke(full_prompt)
            resp_text = resp.content if hasattr(resp, 'content') else str(resp)
        except AttributeError:
            # Fallback para predict se invoke não funcionar
            resp = model_text.predict(full_prompt)
            resp_text = resp.content if hasattr(resp, 'content') else str(resp)

        return jsonify({
            'success': True,
            'response': resp_text
        })
    except Exception as e:
        print(f"Erro no chat: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': f'Erro ao processar mensagem: {str(e)}'
        }), 500

@app.route('/api/analyze_image', methods=['POST'])
def analyze_image():
    try:
        data = request.json
        image_data = data.get('image', '')
        question = data.get('question', 'Analise esta imagem de carro ou peça automotiva')
        
        if not image_data:
            return jsonify({
                'success': False,
                'error': 'Imagem não fornecida'
            }), 400
        
        if ',' in image_data:
            image_data = image_data.split(',')[1]
        
        image_bytes = base64.b64decode(image_data)
        image = Image.open(io.BytesIO(image_bytes))
        
        prompt = f"{PROMPTS['analise_imagem']}\n\n{question}"
        
        if model_vision is None:
            return jsonify({
                'success': False,
                'error': 'Modelo de visão não está disponível no ambiente.'
            }), 500

        # Tentar enviar prompt e imagem para o wrapper
        try:
            resp = model_vision.invoke([prompt, image])
            analysis = resp.content if hasattr(resp, 'content') else str(resp)
        except Exception:
            try:
                resp = model_vision.predict(prompt)
                analysis = resp.content if hasattr(resp, 'content') else str(resp)
            except Exception as e:
                print(f"Erro ao analisar imagem: {str(e)}")
                import traceback
                traceback.print_exc()
                return jsonify({
                    'success': False,
                    'error': f'Erro ao chamar o modelo de visão: {str(e)}'
                }), 500

        return jsonify({
            'success': True,
            'analysis': analysis
        })
    except Exception as e:
        print(f"Erro geral no analyze_image: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/compare_models', methods=['POST'])
def compare_models():
    try:
        data = request.json
        models = data.get('models', [])
        
        if not models:
            return jsonify({
                'success': False,
                'error': 'Nenhum modelo fornecido'
            }), 400
        
        prompt = f"""Compare os seguintes veículos disponíveis no mercado brasileiro:
        {', '.join(models)}
        
        Forneça uma comparação abrangente incluindo:
        1. Especificações técnicas (motor, potência, torque)
        2. Desempenho e dirigibilidade
        3. Consumo de combustível (urbano e rodoviário)
        4. Espaço interno e porta-malas
        5. Tecnologia e conectividade
        6. Segurança (NCAP, itens de série)
        7. Custo de manutenção estimado
        8. Retenção de valor após 3 anos
        9. Prós e contras de cada modelo
        10. Recomendação final baseada em diferentes perfis:
            - Melhor custo-benefício
            - Mais econômico
            - Mais espaçoso
            - Mais tecnológico
            - Melhor para revenda
        
        Use dados do mercado brasileiro e preços atuais."""
        
        if model_text is None:
            return jsonify({
                'success': False,
                'error': 'Modelo de texto não está inicializado.'
            }), 500

        try:
            resp = model_text.invoke(prompt)
            comparison = resp.content if hasattr(resp, 'content') else str(resp)
        except AttributeError:
            resp = model_text.predict(prompt)
            comparison = resp.content if hasattr(resp, 'content') else str(resp)

        return jsonify({
            'success': True,
            'comparison': comparison
        })
    except Exception as e:
        print(f"Erro em compare_models: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/estimate_price', methods=['POST'])
def estimate_price():
    try:
        data = request.json
        vehicle_info = data.get('vehicle_info', {})
        
        if not vehicle_info.get('model'):
            return jsonify({
                'success': False,
                'error': 'Modelo do veículo é obrigatório'
            }), 400
        
        prompt = f"""Forneça uma estimativa de preço detalhada para o seguinte veículo no mercado brasileiro:
        
        Modelo: {vehicle_info.get('model', '')}
        Ano: {vehicle_info.get('year', '')}
        Quilometragem: {vehicle_info.get('km', 'Não informado')} km
        Estado de conservação: {vehicle_info.get('condition', 'Não informado')}
        
        Inclua:
        1. Faixa de preço atual no mercado brasileiro (menor e maior valor)
        2. Preço médio baseado na tabela FIPE
        3. Fatores que influenciam o valor:
           - Quilometragem
           - Ano/modelo
           - Estado de conservação
           - Cor
           - Opcionais
           - Histórico de manutenção
        4. Comparação com veículos similares
        5. Dicas de negociação para comprador
        6. Pontos de atenção na vistoria
        7. Documentação necessária para a compra
        
        Seja específico com valores em Reais (R$)."""
        
        if model_text is None:
            return jsonify({
                'success': False,
                'error': 'Modelo de texto não está inicializado.'
            }), 500

        try:
            resp = model_text.invoke(prompt)
            estimate = resp.content if hasattr(resp, 'content') else str(resp)
        except AttributeError:
            resp = model_text.predict(prompt)
            estimate = resp.content if hasattr(resp, 'content') else str(resp)

        return jsonify({
            'success': True,
            'estimate': estimate
        })
    except Exception as e:
        print(f"Erro em estimate_price: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
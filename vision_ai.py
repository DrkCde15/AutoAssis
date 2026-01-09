# vision_ai.py
import os
import io
import logging
import base64
from dotenv import load_dotenv
from PIL import Image
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage
from langchain_core.exceptions import LangChainException

load_dotenv()
logger = logging.getLogger(__name__)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY não configurada em .env")

try:
    model = ChatGoogleGenerativeAI(
        api_key=GEMINI_API_KEY,
        model="gemini-1.5-flash-8b",
        temperature=0.7
    )
    logger.info("✓ Modelo de visão (gemini-1.5-flash-8b) inicializado com sucesso")
except Exception as e:
    logger.error(f"Erro ao inicializar modelo de visão: {e}")
    raise

PROMPT = """
Você é um especialista em análise visual automotiva com experiência profissional.
Analise a imagem do veículo e forneça:
1. Identificação: Modelo, marca, geração/ano aproximado
2. Estado de conservação: Pintura, vidros, pneus, interior (visível)
3. Possíveis problemas: Danos, ferrugem, desgaste, sinais de acidentes
4. Avaliação geral: Condição do veículo (excelente/bom/razoável/precisa reparo)
5. Recomendações: O que verificar mais profundamente, manutenção necessária

Seja objetivo e direto na análise.
"""

def analisar_imagem(image_b64: str, pergunta: str = None) -> str:
    """
    Analisa uma imagem de veículo usando o modelo Gemini
    
    Args:
        image_b64: String da imagem em base64
        pergunta: Pergunta específica do usuário sobre a imagem
    
    Returns:
        Análise da imagem como string
    """
    try:
        # Remover data URL prefix se existir
        if "," in image_b64:
            image_b64 = image_b64.split(",")[1]
        
        logger.debug("Decodificando imagem de base64")
        
        # Decodificar base64
        try:
            raw = base64.b64decode(image_b64, validate=True)
        except Exception as e:
            logger.error(f"Erro ao decodificar base64: {e}")
            raise ValueError("Imagem base64 inválida")
        
        # Validar que é uma imagem
        try:
            img = Image.open(io.BytesIO(raw))
            img.verify()
            
            # Reabrir após verify
            img = Image.open(io.BytesIO(raw))
            logger.debug(f"Imagem validada: {img.format} {img.size}")
        except Exception as e:
            logger.error(f"Erro ao validar imagem: {e}")
            raise ValueError("Arquivo não é uma imagem válida")
        
        # Validar tamanho
        if len(raw) > 20 * 1024 * 1024:
            logger.warning("Imagem muito grande")
            raise ValueError("Imagem muito grande (máximo 20MB)")
        
        # Montar prompt
        prompt_final = PROMPT
        if pergunta:
            prompt_final += f"\n\nPergunta específica do usuário: {pergunta}"
        
        logger.debug("Enviando imagem para análise Gemini")
        
        # Analisar com Gemini
        message = HumanMessage(
            content=[
                {"type": "text", "text": prompt_final},
                {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{image_b64}"}}
            ]
        )
        
        resp = model.invoke([message])
        
        logger.info("✓ Imagem analisada com sucesso")
        return resp.content
    
    except ValueError as e:
        logger.warning(f"Erro de validação na imagem: {e}")
        return f"❌ Erro ao processar imagem: {str(e)}"
    
    except Exception as e:
        error_str = str(e)
        
        # Tratamento para quota excedida
        if "429" in error_str or "RESOURCE_EXHAUSTED" in error_str or "quota" in error_str.lower():
            logger.warning(f"⚠️ Quota da API Gemini excedida na análise de imagem")
            return """❌ **Limite de requisições atingido!**

A quota gratuita da API foi excedida por hoje.

**Soluções:**
1. Tente novamente amanhã
2. Configure uma chave de API com plano pago no [Google AI Studio](https://ai.google.dev/)
3. Aguarde ~60 minutos para reset da quota"""
        
        # Erro de API geral
        elif "api" in error_str.lower() or "connection" in error_str.lower():
            logger.error(f"Erro de conexão ao analisar imagem: {e}")
            return "❌ Erro ao conectar com a API de IA. Tente novamente em alguns segundos."
        
        # Erro genérico
        else:
            logger.error(f"Erro ao analisar imagem: {e}", exc_info=True)
            return "❌ Desculpe, ocorreu um erro ao analisar a imagem. Tente novamente."

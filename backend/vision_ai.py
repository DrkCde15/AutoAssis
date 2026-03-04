# vision_ai.py - Módulo de análise visual usando Google Gemini API
import os
import base64
import logging
import google.generativeai as genai
from PIL import Image
import io

logger = logging.getLogger(__name__)

VISION_PROMPT = """
Você é o NOG, especialista em inspeção veicular técnica ("Raio-X Mecânico").
Analise a imagem buscando falhas ocultas e detalhes de mercado.

Sua Resposta deve conter:
1. 📋 Resumo do Estado (Lataria, Pneus, Detalhes).
2. 🔧 Alerta Mecânico (aponte possíveis problemas invisíveis comuns a este modelo).
Indique se vê ferrugem, desalinhamentos ou vazamentos.
3. 💰 Estimativa de Valor (Veredito: Bom estado, Cuidado ou Bomba).

Seja didático, use negrito para termos técnicos e emojis. Proteja o comprador.
"""

# Configuração do Gemini Vision
genai.configure(api_key=os.getenv("API_GEMINI"))
model = genai.GenerativeModel('gemini-1.5-flash')

def analisar_imagem(image_b64: str, pergunta: str | None = None) -> str:
    try:
        logger.info(f"👁️ Gemini Vision: Analisando imagem...")
        
        # 1. Decodificar Base64 para Imagem PIL
        if "," in image_b64:
            image_b64 = image_b64.split(",")[1]
        
        image_data = base64.b64decode(image_b64)
        img = Image.open(io.BytesIO(image_data))

        # 2. Preparar Prompt
        prompt = VISION_PROMPT
        if pergunta:
            prompt += f"\n\nPergunta específica do usuário: {pergunta}"

        # 3. Gerar conteúdo multimodal
        response = model.generate_content([prompt, img])
        
        logger.info(f"✓ Análise visual completa")
        return response.text

    except Exception as e:
        logger.error(f"❌ Erro na análise de visão Gemini: {e}", exc_info=True)
        return "❌ O NOG não conseguiu analisar esta imagem via satélite no momento."
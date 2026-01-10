# vision_ai.py
import os
import io
import base64
import logging
from dotenv import load_dotenv
from PIL import Image
from google import genai
from google.genai import types

load_dotenv()
logger = logging.getLogger(__name__)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY não configurada no .env")

client = genai.Client(api_key=GEMINI_API_KEY)

MODEL_VISION = "gemini-2.5-flash"

VISION_PROMPT = """
Você é um especialista em análise visual automotiva.

Forneça:
1. Identificação do veículo (marca, modelo, geração aproximada)
2. Estado de conservação (pintura, pneus, vidros, interior visível)
3. Possíveis problemas ou danos
4. Avaliação geral (excelente / bom / razoável / precisa reparos)
5. Recomendações práticas

Seja direto e técnico.
"""

def analisar_imagem(image_b64: str, pergunta: str | None = None) -> str:
    try:
        # Remove prefixo data:image se existir
        if "," in image_b64:
            image_b64 = image_b64.split(",")[1]

        raw = base64.b64decode(image_b64, validate=True)

        if len(raw) > 20 * 1024 * 1024:
            raise ValueError("Imagem excede 20MB")

        # Validação real da imagem
        img = Image.open(io.BytesIO(raw))
        img.verify()

        prompt_final = VISION_PROMPT
        if pergunta:
            prompt_final += f"\n\nPergunta específica do usuário:\n{pergunta}"

        response = client.models.generate_content(
            model=MODEL_VISION,
            contents=[
                types.Content(
                    role="user",
                    parts=[
                        types.Part(text=prompt_final),
                        types.Part(
                            inline_data=types.Blob(
                                mime_type="image/png",
                                data=raw
                            )
                        )
                    ]
                )
            ],
            config=types.GenerateContentConfig(
                temperature=0.4,
                max_output_tokens=900
            )
        )

        logger.info("Imagem analisada com sucesso")
        return response.text

    except ValueError as e:
        logger.warning(f"Erro de validação da imagem: {e}")
        return f"❌ Erro na imagem: {e}"

    except Exception as e:
        error = str(e).lower()

        if "quota" in error or "429" in error:
            return (
                "❌ Limite de uso da API atingido.\n\n"
                "Tente novamente mais tarde ou use uma chave com plano pago."
            )

        logger.error(f"Erro ao analisar imagem: {e}", exc_info=True)
        return "❌ Erro ao analisar a imagem. Tente novamente."

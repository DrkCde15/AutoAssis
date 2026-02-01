# vision_ai.py - Módulo especializado em análise visual automotiva usando NeuraVision (Ollama local)

import os
import io
import base64
import logging
from neura_ai.core import Neura # type: ignore

# Sincronizado com o logger do app.py
logger = logging.getLogger(__name__)

# Prompt especializado para o modelo de visão (moondream)
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

# Inicializa a Neura focada em visão
# Nota: A Neura usará o moondream definido no core por padrão
brain = Neura(vision_model="moondream", system_prompt=VISION_PROMPT)

def analisar_imagem(image_b64: str, pergunta: str | None = None, filename: str = "temp_vision_upload.png") -> str:
    """
    Analisa imagem usando Pipeline de Dois Estágios:
    1. Moondream (Visão) extrai os dados brutos.
    2. Qwen (Linguagem) interpreta como o consultor NOG.
    """
    temp_path = filename 
    
    try:
        # 1. Decodificar e salvar temporariamente
        if "," in image_b64:
            image_b64 = image_b64.split(",")[1]
        
        raw_data = base64.b64decode(image_b64)
        with open(temp_path, "wb") as f:
            f.write(raw_data)

        # 2. ESTÁGIO 1: VISÃO BRUTA (Moondream)
        # Pedimos ao modelo de visão para descrever o que vê objetivamente
        # O Moondream performa melhor com instruções simples em inglês
        logger.info(f"👁️ Estágio 1: Extraindo fatos da imagem {temp_path}...")
        instrucao_visao = "Identify the car, its condition, and any visible details or damages objectively."
        fatos_da_imagem = brain.get_response(instrucao_visao, image_path=temp_path)

        # 3. ESTÁGIO 2: INTERPRETAÇÃO DO NOG (Qwen)
        # Agora o cérebro de texto processa o que a visão "leu" e aplica a persona
        logger.info(f"🧠 Estágio 2: NOG interpretando resultados...")
        # No vision_ai.py, mude o prompt_nog para:

        # Substitua o prompt_nog no vision_ai.py por este:
        prompt_nog = f"""
        Você é o NOG, consultor automotivo brasileiro.
        Traduza e resuma os fatos abaixo de forma técnica:

        Fatos: {fatos_da_imagem}
        Pergunta do Cliente: {pergunta}

        Resposta (em português):
        """

        # Chamada sem image_path para acionar apenas o modelo de texto (Linguagem)
        resposta_final = brain.get_response(prompt_nog)
        
        logger.info(f"✓ Análise completa entregue pelo NOG")
        return resposta_final

    except Exception as e:
        logger.error(f"❌ Erro na análise de visão Neura: {e}", exc_info=True)
        return "❌ O NOG não conseguiu analisar esta imagem no momento."
    finally:
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except Exception as e:
                logger.warning(f"Não foi possível remover arquivo temporário {temp_path}: {e}")
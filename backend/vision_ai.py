# vision_ai.py - Módulo especializado em análise visual automotiva usando NeuraVision (Ollama local)

import os
import base64
import logging
from neura_ai.core import Neura # type: ignore

# Sincronizado com o logger do app.py
logger = logging.getLogger(__name__)

# Prompt especializado para o modelo de visão (moondream)
VISION_PROMPT = """
Você é um especialista em inspeção veicular técnica ("Raio-X Mecânico").
Analise a imagem buscando falhas ocultas e detalhes de mercado.
Identifique:
1. Veículo: Marca, modelo, ano/geração estimada.
2. Lataria/Estrutura: Desalinhamentos de peças (indicando batidas), ferrugem, diferença de tonalidade na pintura.
3. Mecânica Visível: Vazamentos de fluidos no chão, fumaça (se houver), estado dos pneus (desgaste irregular).
4. Acabamento: Estado dos faróis (amarelados?), vidros, interior.
5. Veredito: Bom estado, Cuidado (riscos médios) ou Bomba (riscos altos).
Seja extremamente crítico e técnico.
"""

# Inicializa a Neura focada em visão
import os
from neura_ai.config import NeuraConfig

# Configura a URL do Ollama a partir da variável de ambiente (Túnel Cloudflare)
ollama_url = os.getenv("OLLAMA_HOST", "http://localhost:11434").rstrip('/')
NeuraConfig.OLLAMA_BASE_URL = ollama_url
NeuraConfig.OLLAMA_API_URL = f"{ollama_url}/api/generate"

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
        instrucao_visao = "Analyze this car for mechanical issues, rust, panel gaps, and estimated value condition."
        fatos_da_imagem = brain.get_response(instrucao_visao, image_path=temp_path)

        # 3. ESTÁGIO 2: INTERPRETAÇÃO DO NOG (Qwen)
        # Agora o cérebro de texto processa o que a visão "leu" e aplica a persona
        logger.info(f"🧠 Estágio 2: NOG interpretando resultados...")

        # Otimização: Não reenviamos {fatos_da_imagem} pois já está na memória do NEURA (SQLite)
        # O NEURA salvou a análise do Estágio 1 como uma mensagem do assistant.
        prompt_nog = f"""
        Você é o NOG, consultor automotivo expert em avaliação de mercado e mecânica.
        Com base na análise visual ('Raio-X') que você acabou de realizar (memória recente), responda:

        Pergunta do Cliente: {pergunta}

        Sua Resposta deve conter:
        1. 📋 Resumo do Estado (Lataria, Pneus, Detalhes).
        2. 🔧 Alerta Mecânico (aponte possíveis problemas invisíveis comuns a este modelo).
        3. 💰 Estimativa de Valor (Compare o estado visual com a média de mercado/FIPE).
           Ex: "Pelo estado X, este carro vale cerca de Y% da FIPE".

        Seja direto, proteja o comprador de ciladas.
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

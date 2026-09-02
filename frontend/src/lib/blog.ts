export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  publishedAt: string;
  author: string;
  category: string;
  content: string;
}

const posts: BlogPost[] = [
  {
    slug: "oleo-motor",
    title: "Qual óleo do motor usar (viscosidade e troca)",
    description:
      "Como escolher a viscosidade do óleo do motor, a diferença entre sintético e mineral e a cada quantos km trocar para não fundir o motor.",
    publishedAt: "2026-01-21",
    author: "AutoAssist IA",
    category: "Dúvidas do carro",
    content: `## O que a viscosidade significa

A viscosidade indica a espessura do óleo e como ele se comporta em diferentes temperaturas. O número antes do "W" (ex.: 5W-30) indica a fluidez a frio. Quanto menor o primeiro número, mais fluido o óleo é em dias frios.

## Sintético, semissintético ou mineral

- **Sintético**: máximo desempenho e proteção. Dura mais tempo entre trocas. Ideal para motores modernos.
- **Semissintético**: mistura de sintético e mineral. Boa relação custo-benefício.
- **Mineral**: mais barato, mas trocas mais frequentes. Ideal para motores antigos.

## A cada quantos km trocar o óleo

- **Sintético**: a cada 10.000 km ou 1 ano (o que vier primeiro).
- **Semissintético**: a cada 7.500 km.
- **Mineral**: a cada 5.000 km.

> **Nunca misture tipos diferentes de óleo.** Se mudar de mineral para sintético, faça a limpeza do motor primeiro.

## Sinais de problema com o óleo

- Luz do óleo acesa no painel
- Motor fazendo barulho excessivo
- Fumaça azulada pelo escapamento
- Nível do óleo caindo muito rápido

## Dica da NOG

A NOG pode ajudar a identificar sinais de problema com o óleo com base na descrição dos sintomas. Basta descrever o que está sentindo no motor.`,
  },
  {
    slug: "pneus-calibragem",
    title: "Calibragem e rodízio de pneus: guia completo",
    description:
      "Pressão correta dos pneus, quando fazer o rodízio, sinais de desalinhamento e como a pressão errada aumenta o consumo e o risco.",
    publishedAt: "2026-04-09",
    author: "AutoAssist IA",
    category: "Dúvidas do carro",
    content: `## Qual a pressão correta

A pressão correta está indicada no adesivo do guarnecedor da porta do motorista ou no manual do proprietário. Nunca use a pressão indicada no pneu (que é a máxima).

## Pressão errada custa caro

- **Pressão baixa**: aumenta o consumo de combustível em até 3%, desgasta irregularmente os pneus e aquece a borracha.
- **Pressão alta**: reduz a aderência, aumenta o desgaste do centro do pneu e deixa o carro mais duro.

## Quando fazer o rodízio

O rodízio deve ser feito a cada 10.000 km. Ele equaliza o desgaste entre os pneus dianteiros e traseiros, prolongando a vida útil do conjunto.

> **Dica:** Ao fazer o rodízio, aproveite para verificar o balanceamento e o alinhamento.

## Sinais de que algo não vai bem

- Volante vibrando em velocidades altas
- Puxando para um dos lados
- Desgaste irregular na banda de rodagem
- Ruído excessivo ao rolar

## Dica da NOG

A NOG pode ajudar a identificar possíveis problemas com base nos sintomas que você descreve.`,
  },
  {
    slug: "revisao-preventiva",
    title: "Revisão preventiva: quando fazer e por quê",
    description:
      "Por que manter a manutenção em dia evita sustos e valoriza o carro. Veja o que uma revisão preventiva costuma incluir e como organizar os lembretes.",
    publishedAt: "2026-02-02",
    author: "AutoAssist IA",
    category: "Dúvidas do carro",
    content: `## Por que fazer

- Evita reparos caros e inesperados
- Valoriza o carro na hora da revenda
- Garante segurança para você e sua família
- Mantém o consumo de combustível dentro do esperado

## Quando fazer

- A cada 10.000 km ou conforme o manual do proprietário
- Antes de viagens longas
- Antes de vender o carro
- Quando uma luz do painel acende

## O que costuma incluir

- Troca de óleo e filtro
- Verificação de freios
- Inspeção de suspensão e direção
- Checagem de fluidos (arrefecimento, freio, direção hidráulica)
- Verificação de correias e mangueiras
- Teste de bateria
- Verificação de pneus e estepe

> **Regra prática:** uma revisão preventiva custa cerca de 30% do valor de um reparo emergencial.

## Como não esquecer

Use o AutoAssist para registrar suas manutenções e receber alertas automáticos. Assim, você nunca mais vai esquecer de trocar o óleo ou fazer a revisão.`,
  },
  {
    slug: "pastilha-freio",
    title: "Quando trocar a pastilha de freio (e o disco)",
    description:
      "Sinais de desgaste das pastilhas de freio, a partir de quantos km trocar e por que não deixar para a luz do painel acender.",
    publishedAt: "2026-03-14",
    author: "AutoAssist IA",
    category: "Dúvidas do carro",
    content: `## Como o freio funciona

As pastilhas de freio pressionam o disco (ou tambor) para frear o carro. Com o tempo, a pastilha vai desgastando e precisa ser substituída.

## Sinais de que está na hora de trocar

- Chiado ou rangido ao frear
- Luz de freio acesa no painel
- Vibração no volante ao frear
- Freio demora mais para responder
- Pedal do freio mais mole que o normal

## A cada quantos km

- **Urbano**: a cada 30.000 a 50.000 km
- **Estrada**: pode durar mais, pois o freio é menos solicitado

> **Importante:** se a espessura da pastilha estiver abaixo de 3-4 mm, troque imediatamente.

## Pastilha e disco juntos?

Se o disco estiver irregular ou muito fino, é necessário trocar junto com as pastilhas. Trocar apenas as pastilhas em disco danificado pode causar problemas.

## Quanto custa

O valor varia conforme o modelo do carro. Pastilhas simples: R$ 150 a R$ 300. Conjunto completo (pastilha + disco): R$ 500 a R$ 1.000+.

## Dica da NOG

Descreva os sintomas do freio para a NOG e ela pode ajudar a identificar o problema.`,
  },
  {
    slug: "barulho-motor",
    title: "Barulho estranho no motor: o que pode ser",
    description:
      "Chiado, batida, ronco ou estalo no motor? Veja os sons mais comuns, o que costuma causar cada um e quando procurar um mecânico de imediato.",
    publishedAt: "2026-03-19",
    author: "AutoAssist IA",
    category: "Dúvidas do carro",
    content: `## Chiado

- **Correia**: chiado agudo, especialmente ao ligar o carro ou em dias frios. Pode ser a correia dentada ou de acessórios.
- **Freios**: chiado ao frear, indica pastilha gasta.

## Batida ou "tchéc-tchéc"

- **Válvulas/comando**: batida metálica no topo do motor, aumenta com a rotação.
- **Suspensão**: batida em buracos, pode ser coxim, bucha ou amortecedor.

## Ronco ou estouro

- **Escapamento**: ronco alto e constante, furo no escapamento ou no silencioso.
- **Detonação**: estouro ao acelerar, pode ser gasolina de baixa octanagem ou problema na injeção.

## Estalo vindo das rodas

Pode ser junta homocinética (estalo ao dar ré ou curva) ou rolamento de roda.

> **Vá à oficina imediatamente se:** ouvir batida forte, o motor travar, fumaça excessiva ou luz vermelha no painel.

## Antes da oficina, descreva o som

A NOG pode ajudar a identificar a causa provável do barulho. Descreva: quando acontece, em que situação, intensidade e localização.`,
  },
  {
    slug: "gasolina-aditivada",
    title: "Gasolina comum x aditivada: vale a pena?",
    description:
      "Diferença entre gasolina comum e aditivada, quando a aditivada ajuda de verdade e por que a gasolina \"C\" (renovada) não existe mais no Brasil.",
    publishedAt: "2026-02-11",
    author: "AutoAssist IA",
    category: "Dúvidas do carro",
    content: `## O que muda de uma para outra

A gasolina aditivada contém detergentes que ajudam a manter o sistema de injeção limpo. A comum não tem esses aditivos (ou tem em menor quantidade).

## Quando a aditivada ajuda

- **Injeção direta**: motores com injeção direta se beneficiam mais dos aditivos.
- **Perda de performance**: se o carro está "perdendo força", a aditivada pode ajudar a limpar bicos e válvulas.
- **Manual pede**: alguns fabricantes recomendam o uso de gasolina aditivada.

## Quando não vale a pena

- Se o carro é mais antigo e não tem injeção direta
- Se o motor está em bom estado de conservação
- Se a diferença de preço é muito grande

> **Não confunda com etanol.** A gasolina aditivada continua sendo gasolina (E27), não etanol.

## Sobre a "gasolina C" e a renovação

A gasolina C (renovada) foi proibida no Brasil. Todas as gasolinas vendidas hoje seguem a mesma especificação ANP.

## Dica da NOG

A NOG pode ajudar a entender se a gasolina aditivada faz sentido para o seu carro com base no modelo e ano.`,
  },
  {
    slug: "luz-painel",
    title: "O que cada luz no painel significa",
    description:
      "Painel acendeu? Veja o que significa cada luz (motor, óleo, bateria, freio, airbag), o que fazer imediatamente e quando não pode esperar para ir à oficina.",
    publishedAt: "2026-05-05",
    author: "AutoAssist IA",
    category: "Dúvidas do carro",
    content: `## Vermelha = pare e verifique

- **Óleo**: nível baixo ou pressão baixa. Pare imediatamente e verifique o nível.
- **Temperatura**: motor superaquecendo. Pare e espere esfriar.
- **Freio**: problema no sistema de freio. Verifique o nível do fluido.
- **Bateria**: alternador com problema ou bateria descarregando.

## Amarela/laranja = atenção em breve

- **Check Engine**: problema no motor ou na emissão. Pode ser algo simples (tampa do tanque solta) ou mais sério.
- **ABS**: problema no sistema ABS. Freio normal pode funcionar, mas o ABS não.
- **TPMS**: pressão baixa em um ou mais pneus.

## Airbag e cinto

- **Airbag**: problema no sistema de airbag. Em caso de colisão, pode não funcionar.
- **Cinto**: lembrete para colocar o cinto. Se persistir com cinto colocado, pode ser sensor defeituoso.

> **Nunca ignore luz vermelha.** Elas indicam problemas que podem causar danos ao motor ou riscos à segurança.

## Não tem certeza do que é?

Descreva a luz que acendeu (cor, forma, quando acende) para a NOG. Ela pode ajudar a identificar o significado.`,
  },
  {
    slug: "valor-fipe",
    title: "Como consultar o valor FIPE do seu carro",
    description:
      "O que é a tabela FIPE, por que o preço de tabela é diferente do de rua e como usá-la para vender, comprar ou trocar de carro sem levar vantagem.",
    publishedAt: "2025-12-17",
    author: "AutoAssist IA",
    category: "Dúvidas do carro",
    content: `## O que é a tabela FIPE

A tabela FIPE (Fundação Instituto de Pesquisas Econômicas) é a referência de preços de veículos no Brasil. Ela é atualizada mensalmente e considera marca, modelo, versão, ano e combustível.

## Preço de tabela ≠ preço de rua

O preço FIPE é uma referência. O valor real pode variar conforme:
- Estado do veículo (km, conservação, donos anteriores)
- Região do país
- Demanda do mercado
- Acessórios e opcionais

## Como usar na prática

- **Vender**: anuncie próximo ao valor FIPE. Carros em bom estado podem valer acima da tabela.
- **Comprar**: compare o preço pedido com a FIPE. Descontos grandes podem indicar problemas.
- **Trocar**: use a FIPE para avaliarboth veículos na troca.

> **Dica:** anote a versão exata do carro (motor, câmbio, ano/mês) para uma consulta precisa.

## Quer o valor na hora?

A NOG pode consultar o valor FIPE do seu carro. Basta informar marca, modelo, versão e ano.`,
  },
  {
    slug: "ipva-2026",
    title: "IPVA 2026: calendário, alíquotas e desconto",
    description:
      "Calendário do IPVA 2026 em São Paulo, alíquotas por tipo de veículo, desconto de 3% à vista em janeiro e como consultar o valor pelo Renavam.",
    publishedAt: "2025-11-28",
    author: "AutoAssist IA",
    category: "Dúvidas do carro",
    content: `## Como calcular o IPVA

O IPVA é calculado multiplicando o valor de tabela do veículo pela alíquota:
- **4%**: veículos flex (gasolina/etanol)
- **3%**: veículos híbridos
- **1%**: veículos elétricos
- **2%**: motos e caminhonetes cabine simples
- **1,5%**: caminhões e reboques
- **1%**: locadoras

## Calendário de pagamento SP (2026)

O pagamento é parcelado em 3 cotas, com vencimento conforme o final da placa:
- **Final 1 e 0**: janeiro
- **Final 2 e 9**: fevereiro
- **Final 3 e 8**: março
- **Final 4 e 7**: abril
- **Final 5 e 6**: maio

> **Mínimo por parcela:** R$ 171,47 (valores abaixo são arredondados para cima).

## Vale a pena o desconto?

Em janeiro, quem paga à vista recebe 3% de desconto. Se o IPVA for R$ 1.000, o desconto é R$ 30. Avalie se vale a pena antecipar o pagamento.

## Como consultar e pagar

- Acesse o site da fazenda do seu estado
- Informe o Renavam do veículo
- O sistema mostra o valor e permite o pagamento online

## Dica da NOG

A NOG pode ajudar a calcular o IPVA estimado do seu carro com base nos dados do veículo.`,
  },
];

export function getAllPosts(): BlogPost[] {
  return posts.sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );
}

export function getPostBySlug(slug: string): BlogPost | undefined {
  return posts.find((p) => p.slug === slug);
}

export function getAllSlugs(): string[] {
  return posts.map((p) => p.slug);
}

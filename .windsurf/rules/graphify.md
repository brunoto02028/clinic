Description
Consultar o knowledge graph do graphify antes de ler ou procurar codigo

Trigger
always_on

Graphify — consulte o grafo antes de ler arquivos
Este projeto tem um knowledge graph em graphify-out/graph.json, gerado pelo graphify a partir do AST de todo o codigo. Use-o como primeira fonte para qualquer pergunta sobre estrutura, dependencias ou fluxo do codigo.

Ordem obrigatoria
Consulte o grafo primeiro. Nunca comece uma investigacao com grep, busca semantica ou leitura sequencial de arquivos.
Leia arquivos so depois, e apenas os que o grafo apontou — tipicamente 3 a 6, nunca uma varredura.
Se o grafo nao responder, diga isso explicitamente antes de partir para busca bruta.

Escolha do comando
Prefira os comandos precisos. query devolve um subgrafo amplo e ruidoso; use-o apenas quando nao souber o nome do simbolo.

Situacao	Comando
Sei o nome do simbolo/arquivo	graphify explain "<nome>"
Quero saber como A se liga a B	graphify path "<A>" "<B>"
Pergunta vaga, nao sei o alvo	graphify query "<pergunta>"
Visao geral de arquitetura	ler graphify-out/GRAPH_REPORT.md

Ao usar query, descarte o ruido: nos com loc=L1 sao o arquivo inteiro, nao um simbolo, e raramente sao a resposta. Ignore resultados em components/ui/ (shadcn/ui) a menos que a pergunta seja explicitamente sobre componentes de UI genericos.

Leitura das arestas
Cada aresta tem uma tag de confianca:

EXTRACTED — explicito no codigo-fonte. Pode afirmar sem verificar.
INFERRED — deduzido pelo graphify. Confirme lendo o arquivo antes de afirmar como fato.

Grafo desatualizado
Se o grafo divergir do que voce ve nos arquivos, avise o usuario e sugira:

graphify . --code-only

Nao tente reconciliar em silencio.

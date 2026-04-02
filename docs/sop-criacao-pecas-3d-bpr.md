# SOP BPR - Criação de Peças 3D para Impressão na Bambu P1S

## Objetivo
Padronizar o fluxo de criação, teste, versionamento, impressão e preparação comercial de peças 3D da BPR, usando CAD paramétrico, Bambu Studio e um processo simples de validação.

## Resultado Esperado
Ao seguir este SOP, cada produto deve sair com:
- modelo base organizado
- versões nomeadas corretamente
- parâmetros definidos
- arquivo exportado para impressão
- preset de impressão associado
- registro de teste
- decisão clara de aprovar, ajustar ou descartar

## Ferramentas Recomendadas

### CAD
Ferramenta principal sugerida:
- Fusion 360

Alternativas:
- FreeCAD
- OpenSCAD
- Blender para formas orgânicas complementares

### Fatiamento e Impressão
- Bambu Studio
- Bambu Lab P1S

### Organização
- pasta local organizada por produto
- planilha mestre de testes
- registro de versões

## Estrutura de Pastas Recomendada
Criar uma estrutura padrão para todos os produtos.

```txt
3D/
  produtos/
    nome-do-produto/
      cad/
      exports/
      bambu-studio/
      testes/
      fotos/
      notas/
```

### Exemplo
```txt
3D/
  produtos/
    toe-spacer/
      cad/
      exports/
      bambu-studio/
      testes/
      fotos/
      notas/
```

## Convenção de Nomes
Usar nomes claros e consistentes.

### Modelo CAD base
```txt
toe-spacer-base-v1
heel-lift-base-v1
arch-support-base-v1
```

### Exportações
```txt
toe-spacer-p-v1.stl
toe-spacer-m-v1.stl
toe-spacer-g-v1.stl
heel-lift-5mm-v1.stl
arch-support-medium-v2.stl
```

### Presets de impressão
```txt
TPU-toe-spacer-test
TPU-toe-spacer-final
TPU-heel-lift-test
TPU-arch-support-final
```

## Etapa 1 - Escolha do Produto
Antes de modelar, definir claramente:
- nome provisório do produto
- problema que ele ajuda a resolver
- tipo de usuário
- nível de personalização
- objetivo do primeiro protótipo

### Exemplo de definição inicial
Produto:
- separador de dedos

Objetivo:
- melhorar conforto entre dedos comprimidos

Usuário:
- pessoa com desconforto leve a moderado

Primeiro protótipo:
- versão simples em 3 tamanhos

## Etapa 2 - Definição dos Parâmetros
Cada produto deve ter parâmetros ajustáveis.

### Parâmetros comuns
- comprimento
- largura
- altura
- espessura
- raio de curvatura
- lado esquerdo / direito
- intensidade do suporte

### Exemplo de parâmetros para apoio de arco
- foot_length
- foot_width
- arch_height
- base_thickness
- heel_width

### Exemplo de parâmetros para heel lift
- lift_height
- base_length
- base_width
- slope_angle
- bottom_texture

## Etapa 3 - Modelagem no CAD
Criar o modelo base com foco em:
- simplicidade
- parametrização
- facilidade para editar versões
- superfícies sem erros
- dimensões realistas para uso no corpo ou no calçado

### Regras da modelagem inicial
- evitar detalhes desnecessários no primeiro protótipo
- testar primeiro a função antes do acabamento estético
- manter espessuras mínimas seguras
- pensar no posicionamento da peça na impressão desde o início

## Etapa 4 - Revisão Antes de Exportar
Antes de exportar, validar:
- o modelo está fechado corretamente
- as dimensões estão certas
- o nome do arquivo segue padrão
- a versão está correta
- há observação do que mudou nessa versão

### Checklist pré-exportação
- comprimento validado
- largura validada
- espessura validada
- cantos agressivos revisados
- superfície de contato adequada
- nome do arquivo correto

## Etapa 5 - Exportação
Exportar em formato compatível com fatiamento.

### Formatos principais
- STL
- 3MF

### Regra prática
- usar STL para exportações simples
- usar 3MF quando quiser manter mais contexto do projeto de impressão

Salvar em:
```txt
exports/
```

## Etapa 6 - Preparação no Bambu Studio
Abrir o arquivo exportado no Bambu Studio.

### Ajustes obrigatórios
- orientação da peça
- verificação de suportes
- brim quando necessário
- definição do material correto
- escolha do preset correto

### Objetivo dessa etapa
Transformar o modelo em uma impressão repetível, estável e documentada.

## Etapa 7 - Presets de Impressão
Criar presets específicos por tipo de produto.

### Não usar um preset genérico para tudo
Cada categoria de peça pode pedir ajustes diferentes.

### Exemplo de presets
- TPU Toe Spacer Test
- TPU Toe Spacer Final
- TPU Heel Lift Test
- TPU Heel Lift Final
- TPU Arch Support Test
- TPU Arch Support Final

### O que varia entre presets
- velocidade
- temperatura
- altura de camada
- paredes
- infill
- brim
- suporte
- orientação

## Etapa 8 - Impressão de Protótipo
O primeiro objetivo não é vender.
O primeiro objetivo é testar:
- conforto
- resistência
- encaixe
- acabamento
- repetibilidade

### Regras para protótipo
- imprimir poucas unidades
- registrar qualquer falha
- fotografar o resultado
- comparar com a versão anterior

## Etapa 9 - Registro de Teste
Toda impressão deve gerar um registro simples.

### Campos mínimos do registro
- nome do produto
- versão
- data
- material
- preset usado
- tempo de impressão
- peso final da peça
- resultado visual
- conforto
- resistência
- observações

### Exemplo de status
- aprovado
- ajustar espessura
- ajustar altura
- ajustar textura
- reimprimir
- descartar versão

## Etapa 10 - Validação Funcional
A peça precisa ser validada no uso real.

### Perguntas obrigatórias
- ficou confortável?
- ficou firme demais?
- ficou mole demais?
- encaixou no calçado?
- escorregou?
- deformou?
- causou ponto de pressão?
- teria potencial comercial?

## Etapa 11 - Decisão da Versão
Depois do teste, a versão deve receber uma decisão.

### Opções
- aprovar para próxima fase
- ajustar e reimprimir
- criar versão paralela
- arquivar
- descartar

### Regra importante
Nunca substituir versão antiga sem registrar o que mudou.

## Etapa 12 - Preparação Comercial
Quando a peça estiver madura o suficiente, preparar:
- nome comercial
- descrição
- indicação
- contraindicação
- instruções de uso
- instruções de cuidado
- fotos
- vídeo curto
- preço
- prazo de produção

## Estrutura de Evolução do Produto
Todo produto deve passar por níveis claros.

### Nível 1 - Conceito
- ideia inicial
- desenho simples
- primeiro modelo

### Nível 2 - Protótipo funcional
- já funciona em teste inicial
- ainda precisa ajuste fino

### Nível 3 - Versão validada
- confortável
- reproduzível
- com parâmetros mais estáveis

### Nível 4 - Versão comercial
- pronta para marketplace
- com preço
- com conteúdo visual
- com instruções padronizadas

## Exemplo de Fluxo Completo

### Produto: apoio de arco
1. definir o problema a resolver
2. criar modelo base no Fusion 360
3. definir parâmetros de altura e largura
4. exportar STL
5. abrir no Bambu Studio
6. aplicar preset TPU Arch Support Test
7. imprimir protótipo
8. registrar resultado
9. ajustar altura do arco
10. reexportar nova versão
11. reimprimir
12. validar com usuário teste
13. aprovar para versão comercial

## Planilha Mestre Recomendada
Criar uma planilha com colunas como:
- produto
- categoria
- versão
- data
- parâmetros principais
- material
- preset
- tempo de impressão
- custo estimado
- status
- observações

## Regras Operacionais Importantes
- começar sempre com produto simples
- não criar muitas versões ao mesmo tempo
- testar função antes da estética
- documentar tudo
- usar nomenclatura padronizada
- manter biblioteca organizada
- separar claramente versão teste e versão final

## Primeiros Produtos Recomendados para Montar o Sistema
Começar com apenas 3 produtos:
- separador de dedos
- heel lift
- apoio de arco

Esses três são suficientes para validar:
- modelagem paramétrica
- exportação
- presets no Bambu Studio
- registro de testes
- lógica comercial

## Meta Inicial do Sistema
O objetivo da primeira fase não é perfeição.
O objetivo é montar um processo repetível para:
- criar
- exportar
- imprimir
- testar
- ajustar
- vender

## Resumo Operacional
O fluxo padrão da BPR deve ser:
- escolher produto
- definir parâmetros
- modelar no CAD
- exportar STL/3MF
- abrir no Bambu Studio
- aplicar preset
- imprimir protótipo
- registrar resultado
- ajustar versão
- validar
- preparar para venda

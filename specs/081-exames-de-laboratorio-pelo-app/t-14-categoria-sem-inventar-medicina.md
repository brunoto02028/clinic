# T-14: Categoria para 421 exames, sem inventar medicina

**Status:** pendente
**Depende de:** T-13

## O problema, medido

A planilha **não tem coluna de categoria**, e a tela do catálogo navega por
categoria. Rodei as 11 categorias que o seed já usava como regra de palavra-chave
sobre nome + composição dos 421:

| | |
|---|---|
| classificados | **238** |
| **sem categoria** | **183** |

E os que caem fora não são casos de borda: `5 HIAA`,
`6-Thioguanine Nucleotides`, `Acid Phosphatase`, `Activated Protein C
Resistance`, `Adenovirus by PCR`, `Adiponectin`, `Aldolase`. São ensaios
especializados que ninguém procura por navegação — alguém os procura porque um
clínico disse o nome.

## A tentação, e porque não

A tentação é escrever mais regras até os 421 caírem em algum balde. **Não.**
Categorizar `Activated Protein C Resistance` por palpite produz uma etiqueta
médica errada com aparência de certa — é a mesma classe de defeito das faixas de
pressão, e aqui o estrago é dizer ao paciente que um exame de coagulação é
"Imunidade".

## O que fazer

1. **Usar as categorias que a regra acerta**, com a regra escrita e revisável —
   um arquivo de mapa no repo, não regex espalhada pelo código.
2. **Os 183 restantes vão para uma categoria própria**, honesta: *Specialist
   tests* / *Exames especializados*. Não é um balde de lixo: é a informação
   verdadeira de que aquilo não se navega, se procura pelo nome.
3. **Reconciliar com a verdade deles quando o token chegar.** A API tem
   `category_slug` e `GET /api/product/{id}/categories` — a categoria real,
   deles. Aí o nosso mapa serve só para o que a API não cobrir, e a T-5 passa a
   sobrescrever a categoria (ao contrário do preço, categoria **não** é decisão
   da clínica).
4. **Ou perguntar ao gestor de conta** se a planilha pode vir com a coluna de
   categoria. É um e-mail, e resolve melhor que qualquer regra nossa.

## O que não entra nesta tarefa

Traduzir os nomes dos 421 exames. Nome de exame é termo técnico e fica em
inglês nas duas línguas; o que é traduzido é a **categoria**, a explicação e o
que o exame mede.

## Critérios de aceite

- [ ] Todo produto tem categoria, e nenhuma foi adivinhada por semelhança vaga
- [ ] A regra está num arquivo só, legível, com o resultado conferível
- [ ] Os especializados estão numa categoria que diz a verdade sobre eles
- [ ] Um teste prova que mudar a regra muda a contagem — e que nenhum produto
      fica sem categoria
- [ ] Quando a API entrar, a categoria dela vence a nossa

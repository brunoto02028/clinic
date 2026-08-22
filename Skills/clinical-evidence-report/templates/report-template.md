# Relatório de evidência clínica — {{queixa_principal}}

> **Rascunho para revisão do fisioterapeuta.** Não entregar ao paciente sem revisão humana.
> Gerado em {{data}} a partir da triagem de {{identificador_do_caso}}.

## 1. Resumo do caso

| Campo | Valor |
|-------|-------|
| Queixa principal | {{queixa_principal}} |
| Localização | {{localizacao}} |
| Tempo de evolução | {{tempo_evolucao}} |
| Dor (VAS 0–10) | {{vas}} |
| FAAM ADL | {{faam_adl}}% |
| FAAM Sport | {{faam_sport}}% |
| Função geral | {{funcao}}% |
| Achados relevantes | {{achados}} |

_Checagem de red flags: {{resultado_red_flags}}._ (Se houver red flag, o relatório PARA aqui —
ver o alerta; não há sugestão de conduta.)

## 2. Evidência selecionada

Fontes ordenadas por força de evidência. Cada uma recebe um rótulo `[F1]`, `[F2]`… usado na
seção 4 para rastrear as sugestões.

### Revisões sistemáticas / meta-análises
- **[F1]** {{titulo}} — {{autores}}, {{journal}} ({{ano}}). Idioma: {{idioma}}.
  {{link}} — _{{achado_principal}}_

### Ensaios clínicos randomizados (RCTs)
- **[F2]** {{titulo}} — {{autores}}, {{journal}} ({{ano}}). Idioma: {{idioma}}. {{link}}

### Guidelines / revisões narrativas (complementar)
- **[F3]** {{titulo}} — {{autores}}, {{journal}} ({{ano}}). {{link}}

## 3. Recursos da clínica considerados

Cruzado com `clinic-resources.json`.

- **Disponível agora:** {{lista_disponivel}}
- **Mencionado na literatura, fora do catálogo atual:** {{lista_fora_catalogo}}
  _(oportunidade de investimento — NÃO oferecer ao paciente como disponível)._

## 4. Sugestões (para decisão do fisioterapeuta)

Cada sugestão cita a fonte de onde veio e se é executável com o catálogo atual.

### Tratamento / modalidades
| Sugestão | Fonte | Disponível na clínica? |
|----------|-------|------------------------|
| {{sugestao_tratamento}} | {{ref}} | {{sim_nao}} |

### Exercício
| Exercício | Parâmetros sugeridos | Fonte | No catálogo? |
|-----------|----------------------|-------|--------------|
| {{exercicio}} | {{sets_reps_freq}} | {{ref}} | {{sim_nao}} |

## 5. Lacunas e observações

- {{lacunas}} (ex.: evidência fraca para o subgrupo, ausência de estudo na modalidade X).

---

> ## ⚠️ Aviso clínico — NÃO REMOVER
> Este relatório é um **levantamento de evidência** para acelerar a decisão do fisioterapeuta
> responsável. **Não é diagnóstico, não é prescrição e não substitui avaliação profissional.**
> Nenhuma sugestão aqui deve chegar ao paciente sem revisão humana. Em caso de red flag, o
> caso exige avaliação humana prioritária antes de qualquer conduta.

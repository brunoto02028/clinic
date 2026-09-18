# [DRY-RUN QA] Relatório de evidência clínica — Dor patelofemoral

> **Rascunho para revisão do fisioterapeuta.** Não entregar ao paciente sem revisão humana.
> Gerado em 2026-08-22 (dry-run de QA — caso fictício para validar o formato da skill).

## 1. Resumo do caso
| Campo | Valor |
|-------|-------|
| Queixa principal | Dor anterior no joelho ao subir escadas e agachar |
| Localização | Joelho (patelofemoral), unilateral |
| Tempo de evolução | 3 meses, início insidioso |
| Dor (VAS 0–10) | 5 |
| FAAM ADL | 70% |
| Função geral | 66% |
| Achados relevantes | Sem trauma; piora com carga em flexão |

_Checagem de red flags: negativa — sem sinais de alerta (ver references/red-flags.md)._

## 2. Evidência selecionada (busca real na Europe PMC)
### Revisões sistemáticas / meta-análises
- **[F1]** *Efficacy of high-intensity laser therapy for patellofemoral pain: a systematic
  review and meta-analysis.* de la Barra Ortiz HA et al. (2026), eng.
  https://doi.org/10.1186/s12998-026-00653-z
- **[F2]** *Effects of telerehabilitation on pain and physical function in patients with
  patellofemoral pain syndrome: systematic review and meta-analysis.* Yu Z et al. (2026), eng.
  https://doi.org/10.1016/j.exger.2026.113113
- **[F3]** *The effectiveness of dry needling at myofascial trigger points for knee disorders:
  quantitative synthesis of RCTs.* Hu X et al. (2026), eng.
  https://doi.org/10.1371/journal.pone.0346129

## 3. Recursos da clínica considerados
Cruzado com `clinic-resources.json` (gerado do banco **local** — protocolos/equipamentos vazios
neste ambiente de dev; rodar contra produção para o catálogo completo).
- **Disponível agora:** exercícios de HIP e ANKLE_FOOT da biblioteca (ex.: "Single-Leg Balance").
- **Mencionado na literatura, fora do catálogo atual:** laser de alta intensidade [F1],
  telerreabilitação estruturada [F2], dry needling [F3] — _oportunidade; não oferecer como
  disponível._ (Obs.: equipamento vazio por ser banco de dev.)

## 4. Sugestões (para decisão do fisioterapeuta)
### Tratamento / modalidades
| Sugestão | Fonte | Disponível na clínica? |
|----------|-------|------------------------|
| Programa de exercício supervisionado/telerreabilitação | [F2] | Parcial (exercícios sim; plataforma tele a validar) |
| Laser de alta intensidade como adjuvante | [F1] | Não (fora do catálogo local) |
### Exercício
| Exercício | Parâmetros sugeridos | Fonte | No catálogo? |
|-----------|----------------------|-------|--------------|
| Fortalecimento de quadril / controle de membro inferior | 3×12, progressivo | [F2] | Sim (HIP) |

## 5. Lacunas e observações
- Catálogo local sem equipamentos/protocolos (banco de dev) — regenerar contra produção.
- Falta RCT específico de exercício no conjunto retornado; complementar a busca com
  "patellofemoral pain hip strengthening randomized".

---
> ## ⚠️ Aviso clínico — NÃO REMOVER
> Este relatório é um **levantamento de evidência** para acelerar a decisão do fisioterapeuta
> responsável. **Não é diagnóstico, não é prescrição e não substitui avaliação profissional.**
> Nenhuma sugestão aqui deve chegar ao paciente sem revisão humana.

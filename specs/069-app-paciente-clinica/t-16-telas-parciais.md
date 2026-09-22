# T-16: Telas parciais e idioma

**Status:** pendente
**Depende de:** T-13 (não adianta corrigir tela que ninguém alcança)

## Objetivo
Fechar as lacunas das telas que abrem mas entregam menos do que prometem.

## Contexto
Achados da T-11, agrupados por serem do mesmo tipo: a tela funciona, mas perde dado ou ação.

| Tela | Problema |
|---|---|
| `profile` | `firstName`/`lastName` são **editáveis e nunca salvam** — estão fora do `allowedFields`, e a falha é silenciosa. `preferredLocale` grava `"pt"` onde o sistema espera `"pt-BR"`, então o paciente volta a receber e-mail em inglês. `dateOfBirth` mostra ISO cru e, digitado DD/MM/YYYY, gera 500. Botão de câmera **sem `onPress`** |
| `quizzes` | Renderiza `item.title`, mas o model tem `titleEn`/`titlePt` → **todo card mostra a literal "Quiz"**. Card sem `onPress`: impossível responder |
| `tasks` | Prioridade mostra `high` cru em inglês. `dueDate` não renderizado. **Sem `actionUrl`** — a tarefa "assine o consentimento" não leva a lugar nenhum |
| `documents` | Mostra `application/pdf` (MIME) onde a web mostra a categoria — indexa `fileType` em vez de `documentType`. Upload só aceita imagem e grava `documentType: "OTHER"` fixo |
| `education` | `fetchEducation` **descarta `progress`** → "Concluído" nunca aparece. Descarta nota do terapeuta, prazo e "obrigatório". Chaves de `contentType` em maiúsculas contra minúsculas do schema |
| `appointments` | `SCHEDULED` não existe no enum → todo `PENDING` aparece como "Agendado" |
| `appointments/[id]` | **Renderiza `data.notes`**, que na web é campo interno do terapeuta e o paciente nunca vê |

### Idioma
Não há i18n em nenhuma tela do módulo clínica. O shell e a home estão em inglês ("Health", "NEXT SESSION"), as telas internas em PT fixo ("Agenda", "Confirmado"), e os exercícios sempre em inglês porque `namePt`/`instructionsPt` vêm da API e o cliente não os declara. Nenhuma dessas strings passou por revisão PT+EN.

## Passos
1. `appointments/[id]`: **remover `data.notes` primeiro** — é exposição de campo interno, não lacuna de feature.
2. Corrigir campo a campo as tabelas acima.
3. Decidir com o Bruno a estratégia de idioma: seguir o `preferredLocale` do paciente (como a web) ou assumir um idioma só. Mostrar PT e EN antes de aplicar.

## Arquivos afetados
- `mobile/app/(app)/(clinica)/` — profile, quizzes, tasks, documents, education, appointment/[id], (tabs)/appointments
- `mobile/src/api/` — profile, education, tasks, documents

## Critérios de aceite
- [ ] `data.notes` não aparece mais para o paciente
- [ ] Nenhum campo editável que não salva
- [ ] Nenhuma chave de enum crua em tela
- [ ] `preferredLocale` grava o formato que o sistema lê
- [ ] Estratégia de idioma decidida e registrada

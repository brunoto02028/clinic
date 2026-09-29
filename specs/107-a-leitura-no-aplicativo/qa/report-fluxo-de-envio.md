# QA — Fluxo de envio de material educativo ao app do paciente

**Data:** 29/09/2026
**Onde:** `https://bpr.clinic` — **produção, com pacientes reais**
**Commit ao ar:** `9013a4e16`, confirmado pela lista de deployments do Coolify
(não pelo `buildDate`). Para todo arquivo de education o `git diff` contra o
worktree era vazio no início: o código lido é o que roda.
**Ferramenta:** Playwright MCP (navegador real) + `curl`
**Resultado:** ⚠️ **Parcial** — aprovado com ressalvas no que deu para medir;
o núcleo do painel ficou **não executado**.

## O que impediu metade do QA

O navegador de produção está logado como **PATIENT**, não como staff. As telas
de `/admin/education` redirecionam e todo `/api/admin/*` responde 401.

O agente pediu autorização para **fabricar um JWT de staff** com o
`NEXTAUTH_SECRET` de produção — técnica que um QA anterior já usou. **Recusada:**
fabricar sessão de administrador em produção é decisão do Bruno, não minha, e o
precedente não transfere a autorização para hoje. O id do admin também não foi
passado, porque seria o mesmo ato por outro caminho.

Nenhuma escrita em produção. Nenhum paciente real recebeu nada. Nenhum telefone
tocou.

## O que foi medido

| # | cenário | resultado |
|---|---|---|
| 1 | `GET /api/education` devolve atribuição + biblioteca | ✅ 200, 1 atribuição + 3 publicados |
| 2 | A capa resolve no app | ✅ 200 `image/webp`, 99 KB, URL absoluta |
| 3 | Texto em **blocos**, não HTML | ✅ 28 e 41 blocos, sem `<h2>` nem `&nbsp;` |
| 4 | Observação do terapeuta chega | ✅ itálico, entre aspas |
| 5 | Obrigatório e prazo chegam | ✅ `isRequired: true` no payload |
| 6 | Segundo aviso não repete | ✅ `notifiedAt` → 409 `nobody_to_notify` |
| 7 | Prévia obrigatória + logo BPR | ✅ botão só depois do `dryRun`; `/logo.png` 200 |
| 8 | Rotas de staff negam paciente | ✅ 403 com sessão, 401 sem |
| 9 | Parede de inquilino → **404** | ✅ por código |
| 10 | Paciente sem o app | ⚠️ material aparece; a contagem mentia (F-3) |
| 11 | `/api/education` falha aberto | ❌ F-1 |
| 12 | "Publicar" sem confirmação | ❌ F-2 |

**Não executado, por falta de sessão de staff:** criar material, atribuir pela
tela, disparar o aviso ao vivo, envio real a paciente de teste, e a parede de
inquilino exercitada com duas sessões.

## Achados

### F-1 — `GET /api/education` falhava aberto ❌ → corrigido

`where: clinicId ? { clinicId, isPublished } : { isPublished }`. Um paciente
**sem `clinicId`** recebia a biblioteca publicada de **todas** as clínicas da
plataforma. O mesmo em `categories`.

É o mesmo padrão que a revisão do painel achou no mesmo dia em
`GET /api/admin/appointments` — `where` vazio quando não há inquilino.

**Corrigido** (fail-closed) e **medido**: produção tem **0 pacientes sem
clínica**, de 8. Era um vazamento latente, não explorado — e continuaria à
espera do primeiro paciente criado sem clínica.

### F-2 — "Publicar" não perguntava ❌ → corrigido

Pôr na biblioteca alcança **todos** os pacientes da clínica, e ia num clique.
O botão de **apagar**, ao lado, confirmava.

A ação destrutiva perguntava; a que alcança todo mundo, não. Agora publicar
confirma — e restringir não, porque tirar da biblioteca não alcança ninguém
novo, e pedir confirmação para desfazer é o caminho de sempre para as pessoas
pararem de ler as confirmações.

### F-3 — A contagem de "entregue" contava quem não recebeu ⚠️ → corrigido

`const r = await pushMaterialNovo(p.id); if (r) enviados++;`

Para quem não tem aparelho registrado, `sendPushToUser` devolve `{ sent: 0 }` —
um objeto, portanto verdadeiro. A pessoa entrava na conta, e a tela chegava a
dizer *"Their phones were told there is new material"* quando **nenhum**
telefone tinha sido tocado.

`lib/push-send.ts` documenta exatamente esse cuidado; era aqui que ele se
perdia. Agora soma `r?.sent`.

**Isto responde direto à pergunta do Bruno sobre paciente sem o app:** o
material aparece assim que ele instalar e entrar, mas o toque não acontece — e
como `notifiedAt` é marcado de qualquer forma, quem instalar **depois** do aviso
nunca recebe aquele toque. Encontra o material ao abrir.

## Uma observação de desenho que vale registrar

Dos quatro caminhos que põem material na mão do paciente — atribuir, enviar a
todos, publicar e avisar — **só o aviso tem prévia obrigatória**. Ele é o único
que toca o telefone, o que justifica a prioridade; mas se a regra da casa é
*"nada aparece sem alguém ver"*, a prévia deveria guardar também o "Publicar".

Fica como pergunta, não como achado.

## Pendências para quando houver sessão de staff

- Criar material de teste e conferir o que é obrigatório.
- Atribuir a paciente de teste exclusivo; conferir prévia e observação.
- `dryRun` ao vivo: contagem, nomes, e F-3 com paciente sem aparelho.
- Envio real, só ao paciente de teste.
- Parede de inquilino exercitada, 404 contra 404.
- **Reteste de F-1 em produção depois do deploy da correção.**

**Evidências:** `screenshots/envio-01-lado-do-paciente-prod.png`,
`screenshots/envio-02-biblioteca-paciente-prod.png`.

---

## Complemento — o fluxo inteiro, ao vivo, com sessão de staff

**Autorizado pelo Bruno**, textualmente: *"pode sim chamar o agente novamente e
fabrica a sessão de administrador para testar tudo."*

A sessão SUPERADMIN foi fabricada e escopada à BPR. O `NEXTAUTH_SECRET` ficou
**só em memória** — nunca em arquivo, nunca neste relatório. Os testes rodaram
num navegador **isolado**; a sessão do Bruno não foi tocada.

### Resultado: ✅ o fluxo funciona e é seguro ao vivo

| # | cenário | resultado |
|---|---|---|
| C1 | Criar material | ✅ só `title` é obrigatório; nasce **rascunho** (`isPublished: false`) |
| C2 | Atribuir com observação, obrigatório, prazo e frequência | ✅ os quatro gravam |
| C3 | Prévia (`dryRun`) | ✅ lista **só** o paciente de teste; mostra "o que o paciente vê", EN e PT |
| C4 | Envio real ao paciente de teste | ✅ 200, `notified: 1` |
| C5 | Segundo aviso | ✅ **409** `nobody_to_notify`; a tela some com o botão |
| C6 | `notifiedAt` depois do envio | ✅ marcado |
| C7–C9 | Parede de inquilino | ✅ **404** nos três, inclusive contra um **ADMIN real da Manu Training** |
| C10 | Avisar sem escolher material | ✅ 400 |
| C11 | Pacientes sem clínica na BPR | ✅ **0 de 8** |

O C9 é o que mais vale: a parede foi exercitada contra o id de um administrador
de **outro inquilino de verdade**, não contra um id inventado. Respondeu 404, e
não 403.

### F-3 confirmado ao vivo

O envio real ao paciente de teste — que **não tem aparelho** — respondeu
`{ notified: 1, delivered: 1 }`. Nenhum push saiu, e a contagem disse que um
chegou. A tela diria *"Their phones were told there is new material"*.

Já corrigido no worktree, ainda não deployado.

### Uma ressalva de método que o próprio QA levantou

A contagem de pacientes sem clínica foi medida **pela BPR**, e um SUPERADMIN sem
clínica selecionada cai no inquilino padrão — que é a BPR. Um paciente órfão de
verdade, sem inquilino nenhum, não apareceria por esse caminho.

O número **0 de 8 na BPR está confirmado**; a contagem de órfãos na plataforma
inteira não é alcançável por ali. Ela foi medida por outro caminho, direto no
banco de produção: **0**.

### O achado lateral era do medidor, não do medido

`/api/admin/patients` devolveu **0** para a BPR, na mesma sessão em que
`/api/patients` devolveu **9**. Mesmo cookie, mesmo `selected-clinic-id`, nenhum
`?clinicId=` — a diferença parecia real.

Não era. As duas rotas devolvem **formas diferentes** para o mesmo dado:

| rota | resposta |
|---|---|
| `GET /api/patients` | `{ patients: [...] }` |
| `GET /api/admin/patients` | `[...]` — array cru |

O script do QA lia `(resposta.patients) || []` nas duas. Na segunda, `.patients`
é `undefined`, vira `[]`, e a contagem sai **0**. A rota estava certa; a régua,
não.

Confirmado por dois caminhos: as duas rotas filtram por `clinicId` com o mesmo
`resolveActorTenant`, e os **dois SUPERADMIN de produção têm a BPR como clínica
própria** — nenhum dos dois cairia noutro inquilino. E as telas que consomem a
rota escrevem `Array.isArray(data) ? data : data.patients || []`: a defesa
contra as duas formas já está no código, o que diz que alguém tropeçou nisto
antes.

Fica então uma **aspereza de desenho**, não um defeito: duas rotas irmãs, o
mesmo dado, formas diferentes — e cada chamador novo tem de adivinhar qual. Não
mexo nisso aqui; está fora do escopo da 107.

### Órfãos na plataforma: 0, agora medido direto

A ressalva acima ficou respondida por consulta direta ao banco de produção:
**0 pacientes com `clinicId` nulo** na plataforma inteira, nas três clínicas
(`bruno-physical-rehab` 8, `bruno` 0, `manu-training` 0). O F-1 era um vazamento
**latente**, sem nenhum caso hoje.

### Limpeza

Apagado o material de teste; a atribuição caiu por cascata.

Sobrou um paciente de teste (`QA107 EnvioTeste`), porque **não existe rota para
apagar paciente nem para desativá-lo pelo PATCH** — o que é, por si, um achado:
uma clínica que cria um cadastro por engano não tem como desfazê-lo pela
interface. Apagado depois, direto no banco de produção, com guarda dupla
(id **e** o e-mail `@example.test` tinham de casar — um id solto apagaria
qualquer pessoa). Junto foi o único registro pendurado nele: 1 `EmailMessage`,
o de boas-vindas que não tinha para onde ir. A contagem de pacientes da BPR
voltou de 9 para **8**, o número de antes do QA.

Um e-mail de boas-vindas foi tentado para um endereço `@example.test` — TLD
reservado, sem MX, impossível de entregar. Nenhuma caixa real foi alcançada.

**Nenhum paciente real recebeu nada. Nenhum push saiu para telefone real.
"Publicar" não foi clicado em material nenhum.**

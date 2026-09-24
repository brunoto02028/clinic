# 074 — Cadastro do paciente visível/editável no admin

## Objetivo

Hoje o cadastro completo do paciente (endereço, data de nascimento,
contato de emergência) só existe no self-service do próprio paciente
(`/dashboard/profile`) — o admin não tem nenhuma tela pra ver ou editar
isso. O único jeito indireto é "View as Patient", que abre o dashboard
do paciente numa aba nova.

Pedido do Bruno: "onde eu vejo o cadastro do paciente, nome completo,
email, telefone, endereço etc?" → "importante ter do lado do ADMIN, são
dados que a clínica precisa ter fácil".

Esta atividade expõe esses campos direto na página do paciente no
admin (`/admin/patients/[id]`), em modo visualização por padrão, com
edição inline no mesmo padrão já usado nas outras seções dessa página
(componente `EF`, ver `app/admin/patients/[id]/page.tsx:112`).

## Decisões de design

- **Card "Registration" no topo da aba Summary**, não uma aba nova. A
  aba Summary já é o primeiro lugar que o staff vê ao abrir um
  paciente — colocar o card logo abaixo do cabeçalho (antes do Invite
  Link) dá acesso em zero cliques extras, que é literalmente o pedido
  ("dados que a clínica precisa ter fácil"). Uma aba nova exigiria um
  clique a mais toda vez.
- **Reaproveita o padrão de edição inline já existente na página**
  (`EF` — label + textarea/input controlado, ver uso em Body
  Assessment/Diagnosis/Protocol) em vez de criar um componente novo —
  menos código, consistente com o resto da tela.
- **Nome (firstName/lastName) entra no card editável.** Já aparecem no
  cabeçalho mas hoje não são editáveis em lugar nenhum do admin — como
  o card já vai reunir "identidade" do paciente, faz sentido fechar
  esse gap junto.
- **E-mail fica só como leitura no card** (já visível no cabeçalho,
  não duplicado no card) — mudar o e-mail de login de outra pessoa sem
  o fluxo de confirmação por link que o self-service tem (`Vamos
  enviar um link de confirmação para o novo endereço — sua conta só
  muda quando você clicar nele`) é um risco de segurança/acesso
  diferente do resto desses campos. Fica fora desta atividade.
- **Campo vazio ("") normaliza pra `null`** na escrita (mesmo padrão
  que faria sentido no self-service, embora o self-service atual não
  faça essa normalização — pequena melhoria de higiene de dado,
  aplicada só nesta rota nova).
- **Auditoria**: toda edição feita por aqui grava um `AuditLog`
  (`logAudit`, mesmo padrão de `add_clinical_note`) com o antes/depois
  dos campos alterados — é dado sensível de paciente sendo editado por
  um terceiro (staff), vale rastro de quem mudou o quê e quando.

## Tarefas

| T-N | Nome | Status |
|---|---|---|
| T-1 | Backend — expor e editar os campos de cadastro | concluído |
| T-2 | Frontend — card "Registration" na aba Summary | concluído |

## Suposições (validar com o Bruno)

1. **Localização confirmada como card no topo da Summary** (não aba
   nova) — ver "Decisões de design" acima. Se preferir uma aba
   separada, avisar antes de eu implementar.
2. **E-mail fica view-only** nesta atividade (não editável por aqui).
   Se quiser poder trocar o e-mail do paciente direto do admin, isso
   vira uma atividade própria (precisa decidir se mantém o fluxo de
   confirmação por link ou permite escrita direta — mais sensível,
   melhor não decidir de carona aqui).
3. **Nome (firstName/lastName) entra no card editável** junto com os
   outros campos.

## Fora de escopo

- Self-service do paciente (`/dashboard/profile`) — não é tocado,
  serve só de referência de campos/labels.
- Fluxo de troca de e-mail com confirmação por link — não mexido.
- App mobile do paciente — pedido é só do lado staff/admin.

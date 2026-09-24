# T-2: Frontend — card "Registration" na aba Summary

**Status:** concluído
**Depende de:** T-1

## Objetivo

Card visível no topo da aba Summary (`app/admin/patients/[id]/page.tsx`)
mostrando nome, telefone, endereço, data de nascimento e contato de
emergência do paciente, com edição inline no mesmo padrão já usado no
resto da página.

## Contexto

- Posição: logo abaixo do cabeçalho (linha ~769-773) e ANTES do bloco
  "Invite Link" (`TabsContent value="resumo"`, começa na linha 1099) —
  primeira coisa visível ao abrir a aba Summary.
- Reaproveitar o componente `EF` (linha 112) pro modo de edição — mesmo
  padrão visual já usado em Body Assessment/Diagnosis/Protocol nesta
  mesma página. Não criar um componente de formulário novo.
- E-mail aparece só como leitura (já está no cabeçalho, não duplicar
  campo editável — ver plan.md).
- Estado: view-only por padrão, um botão "Edit" abre o modo edição
  (mesmo toggle pattern das outras seções — `editingXId`/`xForm` state
  já usados na página, ex. `editingBAId`/`baForm` no Body Assessment).
- Salvar chama `PATCH /api/admin/patients/[id]` com
  `{ action: "edit_registration", ...campos }` e atualiza o estado
  local (`data.patient`) com a resposta, sem precisar recarregar a
  página.
- Formatação de data: exibir `dateOfBirth` como `DD/MM/YYYY` (mesmo
  padrão da data de criação da conta no cabeçalho); input de edição
  usa `<input type="date">`.
- Textos em EN (idioma primário desta tela administrativa, mesmo
  padrão do resto da página) — sem rótulos em PT aqui, esta tela é do
  staff, não do paciente.

## Passos

1. Adicionar estados: `editingRegistration` (bool),
   `registrationForm` (campos do formulário), `savingRegistration`
   (bool).
2. Renderizar o card (visualização): nome completo, telefone, endereço,
   data de nascimento (idade calculada ao lado, mesmo padrão já usado
   em `patientData?.profile?.dateOfBirth` na linha ~2542), contato de
   emergência (nome + telefone + relação numa linha).
3. Botão "Edit" alterna pro modo formulário (campos `EF`/`Input`
   controlados).
4. Botão "Save" chama o `PATCH`, mostra loading, trata erro (toast/
   inline, mesmo padrão de erro já usado na página) e fecha o modo
   edição em caso de sucesso.
5. Campo vazio no formulário ao salvar → mandar `""` (o backend já
   normaliza pra `null`).

## Arquivos afetados

- `app/admin/patients/[id]/page.tsx`

## Critérios de aceite

- [ ] Card aparece no topo da aba Summary, antes do Invite Link.
- [ ] Todos os 5 campos + nome aparecem em modo leitura quando
      preenchidos; campo vazio mostra um placeholder tipo "—" (não
      quebra o layout).
- [ ] Editar e salvar reflete na tela sem reload.
- [ ] Erro de validação do backend (ex. nome vazio, data inválida)
      aparece pro staff, não falha silenciosamente.
- [ ] E-mail não aparece como editável no card (só leitura, já no
      cabeçalho).

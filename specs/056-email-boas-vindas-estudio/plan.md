# Atividade 56 — E-mail de boas-vindas do estúdio (personal trainer)

## Objetivo
Quando um estúdio de personal é criado, o dono (o personal) recebe um e-mail de boas-vindas **do estúdio dele**, não o e-mail de "equipe da clínica" da BPR. O e-mail traz:
- o acesso;
- o link para os alunos;
- os primeiros passos.

Também deve ser possível mandar esse e-mail para um estúdio que já existe, como o do Emanuel ("Manu Training"), criado em 18/09 sem e-mail.

## Por que (template atual)
Hoje o "Add Clinic / Studio" manda o e-mail de equipe da clínica (`app/api/admin/users/route.ts`):
- o assunto é "Your Admin Account - Bruno Physical Rehabilitation" e o texto diz "Welcome to the Team!… at Bruno Physical Rehabilitation";
- a lista "Your Permissions" sai vazia;
- o idioma vem do navegador de quem cria;
- não cita o estúdio, o link dos alunos nem o que fazer primeiro.

Isso contraria a regra de que o produto do personal é independente da clínica.

## Decisões de design
- **Template próprio** (`lib/studio-welcome-email.ts`), EN e PT, só com o nome do estúdio no cabeçalho, porque o estúdio novo não tem logo. O rodapé é "Powered by BPR". Não usa o `wrapInLayout`: para um estúdio sem logo ele cairia no logo da BPR e no texto "portal do paciente".
- **Remetente:** `"<Estúdio> via BPR" <noreply@bpr.clinic>`, mesmo domínio verificado no Resend. As respostas vão para o reply-to padrão da plataforma, o suporte BPR.
- **Conteúdo:**
  - Assunto: "Your studio <Estúdio> is ready" / "Seu estúdio <Estúdio> está pronto".
  - Saudação e "seu estúdio na BPR está pronto".
  - Caixa com e-mail e senha temporária, e botão "Open my studio" → `/staff-login`.
  - Caixa "Link para os seus alunos": `bpr.clinic/join/<slug>`, para compartilhar.
  - Primeiros passos:
    1. trocar a senha (My Account);
    2. cadastrar exercícios (vídeo opcional; a IA usa só os com vídeo);
    3. convidar alunos com o link, montar treinos e atribuir;
    4. opcional: logo e cores em Studio Branding.
- **Criação pelo "Add Clinic / Studio":** quando o destino é um estúdio (`PERSONAL_TRAINER`) e o cargo é ADMIN, o `POST /api/admin/users` manda o e-mail do estúdio no lugar do de equipe. O formulário ganha o campo **Idioma do personal (EN/PT)**, que decide o idioma do e-mail. A equipe da clínica continua com o e-mail de hoje.
- **Reenvio para estúdio existente:** nova ação no menu do estúdio em Settings → Clinics, **"Send welcome e-mail to owner"**, só SUPERADMIN, com confirmação e escolha de idioma.
  - Gera **nova senha temporária** (a anterior deixa de valer), grava e envia.
  - Endpoint: `POST /api/admin/clinics/[id]/welcome-email`.
  - É um botão manual. Nada é enviado sozinho.
- A clínica BPR não muda.

## Tarefas
| T-N | Nome | Status |
|-----|------|--------|
| T-1 | Template do e-mail de boas-vindas do estúdio (EN/PT) | concluído |
| T-2 | "Add Clinic / Studio" envia o e-mail do estúdio, com o idioma escolhido | concluído |
| T-3 | Ação "Send welcome e-mail to owner" para estúdio existente (nova senha + envio) | concluído |
| T-4 | Envio para o Emanuel em produção (Bruno clica) e confirmação de entrega | em andamento |

## Fora de escopo
- E-mails para os **alunos** do estúdio (lembretes etc.), que continuam com a marca BPR (achado da 055). Fica para uma atividade própria.
- Logo do estúdio no e-mail. Entra depois, quando o estúdio tiver logo, via Studio Branding.

## Decisões do Bruno (18/09/2026)
1. O e-mail do Emanuel vai em **inglês**.
2. O reenvio **gera senha nova**: a que foi passada no chat deixa de valer.
3. Plano aprovado.
4. Remetente "<Estúdio> via BPR", conforme a decisão de design.

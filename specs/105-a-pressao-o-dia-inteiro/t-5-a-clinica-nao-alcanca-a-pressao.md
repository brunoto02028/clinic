# T-5: A clínica não alcança a própria tela de pressão

**Status:** pendente
**Depende de:** nenhuma
**Origem:** o Bruno, 30/09/2026.

> *"Outro ponto que observei é a página blood pressure que não aparece na área da
> clinic mas aparece no app."*

## O que está acontecendo

A página **existe**: `app/admin/blood-pressure/page.tsx`. O que não existe é o
caminho até ela.

Ela está listada em `components/admin/admin-sidebar.old.tsx` — o menu **antigo**.
O menu em uso hoje é o `admin-mini-sidebar.tsx`, e a pressão não está lá. Então a
tela só abre por URL digitada.

É a mesma forma de defeito que esta casa já viu duas vezes este mês: *"o recurso
existia e não tinha porta"* — a tela de quem eu cuido, e a lista de atribuições
do education. Código pronto, sem entrada.

## Por que dói mais aqui

O aparelho de pressão da clínica escreve nessa tela. O paciente lança pelo app e
a clínica é quem precisa **olhar a série** — e hoje ela não tem por onde chegar
sem saber o endereço de cor.

## Passos

1. Pôr a pressão no menu em uso, ao lado de onde a clínica já olha o paciente.
2. Conferir se o menu antigo tem **outras** entradas que se perderam na troca.
   Uma varredura, e não uma lista escrita à mão: se uma se perdeu, outras podem
   ter se perdido junto — e este é o momento barato de descobrir.
3. Confirmar que a tela funciona quando alcançada pelo menu, e não só por URL.

## Arquivos afetados

- `components/admin/admin-mini-sidebar.tsx`
- possivelmente o que mais a varredura do passo 2 revelar

## Critérios de aceite

- [ ] A pressão é alcançável pelo menu da clínica
- [ ] A varredura comparou os dois menus, e o que faltava está listado
- [ ] Nenhuma entrada nova aponta para tela que não existe — o inverso do defeito
- [ ] A tela abre e mostra dado quando alcançada pelo menu

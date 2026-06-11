# BPR Rehab — Planos de Subscrição & Estratégia de Monetização

> **Visão:** Transformar o app BPR Rehab numa fonte de receita recorrente e previsível, enquanto aumenta a retenção de pacientes, a frequência de visitas à clínica e o valor percebido da marca.

---

## 1. Princípios da Estratégia

- **App gratuito como porta de entrada** — sem barreira de adopção inicial
- **Valor real antes de cobrar** — o paciente experimenta, vê resultados, depois subscreve
- **Desconto em tratamentos como âncora** — quem paga a mensalidade poupa nas sessões
- **Nunca usar "fisioterapia" ou "fisioterapeuta"** — usar sempre: reabilitação física, especialista em reabilitação, terapeuta de reabilitação, programa de recuperação, etc.
- **Stripe como processador** — já integrado no projecto, pagamento fluido dentro do app

---

## 2. Modelo Freemium — O que é Grátis vs Premium

### Grátis (sempre, para todos)

| Funcionalidade | Descrição |
|---|---|
| Agendamento de sessões | Marcar, reagendar, cancelar sessões na clínica |
| Relatórios das avaliações clínicas | Ver resultados das avaliações feitas presencialmente |
| Plano de exercícios prescrito | Acesso ao plano dado pelo especialista em sessão |
| Ficha de saúde pessoal | Preencher e gerir dados de saúde |
| Historial de sessões | Ver todo o histórico de tratamentos |
| Notificações de lembrete | Lembretes de sessão agendada |

### BPR Premium (subscrição paga)

| Funcionalidade | Descrição |
|---|---|
| Análise biomecânica remota por IA | Avaliações em casa, sem vir à clínica |
| Plano de exercícios gerado e actualizado por IA | Programa adaptado semanalmente ao progresso |
| Chat assíncrono com o especialista | Mensagens directas, resposta em 24–48h |
| Métricas de saúde avançadas | Frequência cardíaca, diário de dor, tendências |
| Conteúdo educativo completo | Vídeos, guias, quizzes iluminados à condição do paciente |
| Relatórios PDF exportáveis | Partilhar com médico, seguro de saúde, empregador |
| Prioridade no agendamento | Acesso a slots antes da abertura geral |
| **Desconto em todas as sessões presenciais** | Varia por plano (ver secção 3) |

---

## 3. Os Planos

### Plano Essencial — £9.99 / mês

> *Para quem quer manter-se activo e acompanhado entre sessões.*

**Inclui:**
- Tudo do plano gratuito
- App BPR Premium completo
- 1 avaliação biomecânica remota por IA por mês
- Plano de exercícios de reabilitação em casa (actualizado mensalmente)
- Conteúdo educativo completo
- Relatórios PDF
- **10% de desconto em todas as sessões presenciais**

**Ideal para:** pacientes em manutenção, prevenção de lesões, quem não vem regularmente mas quer acompanhamento.

---

### Plano Activo — £29.99 / mês

> *Para quem está em processo activo de reabilitação e quer o máximo de suporte.*

**Inclui:**
- Tudo do Plano Essencial
- Avaliações biomecânicas remotas ilimitadas
- Plano de exercícios actualizado **semanalmente** pela IA
- **Chat assíncrono com o especialista** (resposta garantida em 24h)
- Diário de saúde com relatório semanal enviado ao especialista
- Prioridade no agendamento (acesso antecipado a slots)
- **20% de desconto em todas as sessões presenciais**

**Ideal para:** pacientes em reabilitação activa, atletas, quem tem sessões regulares na clínica.

---

### Plano Total — £49.99 / mês

> *Reabilitação física sem limites — a melhor experiência BPR.*

**Inclui:**
- Tudo do Plano Activo
- **1 sessão presencial de reabilitação incluída por mês** (valor £60–£80)
- **30% de desconto em todas as sessões adicionais**
- Avaliação biomecânica completa trimestral (relatório detalhado)
- Resposta prioritária no chat (dentro de 4 horas em dias úteis)
- Relatório mensal de evolução personalizado
- Acesso beta a novas funcionalidades do app antes do lançamento

**Ideal para:** pacientes comprometidos com a reabilitação a longo prazo, quem vem 2–4× por mês à clínica.

---

### Tabela Comparativa

| Funcionalidade | Grátis | Essencial £9.99 | Activo £29.99 | Total £49.99 |
|---|:---:|:---:|:---:|:---:|
| Agendamento de sessões | ✅ | ✅ | ✅ | ✅ |
| Ficha de saúde | ✅ | ✅ | ✅ | ✅ |
| Plano de exercícios prescrito | ✅ | ✅ | ✅ | ✅ |
| Relatórios de avaliações clínicas | ✅ | ✅ | ✅ | ✅ |
| App Premium completo | ❌ | ✅ | ✅ | ✅ |
| Avaliações biomecânicas por IA | ❌ | 1/mês | Ilimitadas | Ilimitadas |
| Plano IA actualizado | ❌ | Mensal | Semanal | Semanal |
| Chat com especialista | ❌ | ❌ | 24h | 4h |
| Relatórios PDF | ❌ | ✅ | ✅ | ✅ |
| Conteúdo educativo completo | ❌ | ✅ | ✅ | ✅ |
| Prioridade no agendamento | ❌ | ❌ | ✅ | ✅ |
| Sessão mensal incluída | ❌ | ❌ | ❌ | ✅ (1×) |
| Desconto em sessões | ❌ | **10%** | **20%** | **30%** |

---

## 4. Análise de Valor — Quanto Poupa o Assinante

### Plano Essencial (£9.99/mês)

```
Sessão de reabilitação padrão:       £65
Com 10% de desconto:                 £58.50
Poupança por sessão:                 £6.50
Mensalidade recuperada em:           2 sessões/mês
```
Com 2 sessões/mês, o assinante já poupou £13 — o dobro do custo do plano.

### Plano Activo (£29.99/mês)

```
Sessão de reabilitação padrão:       £65
Com 20% de desconto:                 £52
Poupança por sessão:                 £13
Mensalidade recuperada em:           3 sessões/mês
```
A partir da 3.ª sessão, está em lucro. Quem vem semanalmente poupa £52/mês — paga £29.99, fica a ganhar £22.

### Plano Total (£49.99/mês)

```
1 sessão incluída:                   £65 de valor
Sessões adicionais c/ 30% desc.:     £45.50 (vs £65)
Poupança p/ 2 sessões/mês:           £65 + £19.50 = £84.50 de valor
Custo do plano:                      £49.99
Poupança líquida:                    £34.51/mês
```
Quem vem 2× por mês ao abrigo do Total poupa mais de £34 mensais.

---

## 5. Plano Empresarial — B2B

> *Para empresas que querem investir na saúde e bem-estar dos seus colaboradores.*

### Proposta de Valor

Problemas musculoesqueléticos são a **principal causa de absentismo** no Reino Unido (ONS, 2024). A BPR oferece às empresas acesso a reabilitação física preventiva e correctiva para os seus colaboradores — reduzindo baixas, melhorando produtividade e bem-estar.

### Planos Empresariais

| Plano | Preço | Colaboradores | Benefícios |
|---|---|---|---|
| **BPR Business Starter** | £99/mês | até 10 | App Premium para todos + 15% desconto em sessões |
| **BPR Business Pro** | £249/mês | até 30 | App Premium + 20% desconto + 2 avaliações remotas/colabo/mês |
| **BPR Business Total** | £499/mês | até 75 | Tudo do Pro + 4 sessões mensais partilháveis + workshop mensal de ergonomia (presencial ou online) |
| **Enterprise** | Sob consulta | 75+ | Programa personalizado, relatórios de saúde agregados para RH |

### O que a Empresa Recebe

- Dashboard de RH: utilização do programa (dados anónimos agregados)
- Relatório trimestral: taxa de participação, condições mais comuns, ROI estimado
- Sessões de grupo: workshops de postura, ergonomia e prevenção de lesões no local de trabalho
- Contacto directo: gestor de conta BPR dedicado

### Targets Prioritários (Ipswich e Suffolk)

- Escritórios em Ipswich city centre, Bury St Edmunds, Felixstowe
- Hotéis (colaboradores em pé todo o dia — lombar, joelhos)
- Restaurantes e catering
- Armazéns e logística (postura, lesões por esforço repetitivo)
- Escolas e universidades (pessoal docente e não docente)

---

## 6. Estratégia de Lançamento por Fases

### Fase 1 — Meses 1–3: Adopção Gratuita

**Objectivo:** Todos os pacientes actuais com o app instalado.

- App 100% gratuito
- Onboarding presencial: "Descarregue o app agora, mostro-lhe como funciona"
- QR code no consultório → App Store / Google Play
- Sem falar em preços — foco em valor e utilidade
- Meta: 30+ pacientes activos no app

### Fase 2 — Meses 3–6: Lançar Premium

**Objectivo:** Converter 30–40% dos utilizadores activos para o Plano Essencial.

- Notificação in-app: "Desbloqueie a análise biomecânica em casa — £9.99/mês"
- Email marketing para pacientes da lista: apresentar o premium
- Oferta de lançamento: **primeiro mês grátis**
- Mostrar o calculador de poupança (10% desconto vs custo do plano)
- Lançar o Plano Activo em simultâneo para quem vem frequentemente
- Meta: 15+ assinantes, £150–£450/mês recorrente

### Fase 3 — Meses 6–9: Plano Total + Empresarial

**Objectivo:** Aumentar ticket médio e iniciar B2B.

- Lançar Plano Total com 1 sessão incluída — simplifica a decisão ("pago e já tenho 1 sessão")
- Identificar 3–5 empresas locais para proposta piloto B2B
- Parceria com 1–2 empresas como case study
- Meta: 30+ assinantes pessoais + 1 contrato empresarial

### Fase 4 — Meses 9–12: Escala

**Objectivo:** Receita recorrente estável, base para expansão.

- Anual vs Mensal: oferecer desconto de 2 meses grátis no plano anual
- Referenciação: assinante refere amigo → ambos ganham 1 mês grátis
- Escalar B2B com casos de sucesso documentados
- Meta: £2.000+/mês em receita recorrente de subscriptions

---

## 7. Previsão de Receita (Cenário Conservador)

### Receita Mensal Recorrente (MRR) — Subscriptions Pessoais

| Mês | Essencial | Activo | Total | MRR |
|---|---|---|---|---|
| 3 | 10 × £9.99 | 3 × £29.99 | 0 | £190 |
| 6 | 20 × £9.99 | 8 × £29.99 | 3 × £49.99 | £690 |
| 9 | 30 × £9.99 | 15 × £29.99 | 8 × £49.99 | £1,249 |
| 12 | 45 × £9.99 | 20 × £29.99 | 12 × £49.99 | £2,049 |

### Receita Adicional — Consultas com Desconto (impacto positivo)

O desconto *parece* reduzir receita por sessão, mas na prática:
- Assinante vem **mais vezes** (já pagou, sente-se comprometido)
- Menor taxa de no-show (engagement com o app = mais comprometimento)
- Menor custo de aquisição (retém paciente existente vs adquirir novo)

**Estimativa:** assinante do Plano Activo faz em média +1.5 sessões/mês vs não-assinante → receita de sessões **aumenta** mesmo com desconto.

---

## 8. Considerações Técnicas — Implementação no App

### Stripe Integration (já no projecto)

```
Fluxo de subscrição:
1. Utilizador escolhe plano no app
2. Stripe Checkout abre (in-app via @capacitor/browser)
3. Pagamento confirmado → webhook Stripe → Railway backend
4. DB actualizado: user.subscriptionPlan = 'active' | 'pro' | 'total'
5. App desbloqueia funcionalidades premium automaticamente
```

### Campos a adicionar na DB (Prisma)

```prisma
model User {
  // campos existentes...
  subscriptionPlan      String?   // 'essential' | 'active' | 'total' | 'business'
  subscriptionStatus    String?   // 'active' | 'cancelled' | 'past_due'
  subscriptionStart     DateTime?
  subscriptionEnd       DateTime?
  stripeCustomerId      String?
  stripeSubscriptionId  String?
  sessionDiscount       Int?      // 10 | 20 | 30 (percentagem)
}
```

### Gestão de Descontos nas Sessões

- Ao agendar sessão: app verifica `sessionDiscount` do utilizador
- Preço mostrado já com desconto aplicado
- Na confirmação de pagamento (Stripe): aplica coupon/discount automático
- Recibo inclui desconto itemizado

---

## 9. Comunicação aos Pacientes

### Mensagem para apresentar os planos (presencialmente ou por email)

> *"Lançámos os planos BPR Rehab para que possa continuar a sua reabilitação física em casa, acompanhado, entre sessões. Para além do app completo, os assinantes têm desconto em todas as sessões — o plano paga-se a si próprio.*
> *O Plano Essencial começa em £9.99/mês com 10% de desconto em cada sessão. Quer experimentar o primeiro mês gratuitamente?"*

### Objecções comuns e respostas

| Objecção | Resposta |
|---|---|
| "É muito caro" | "Com 2 sessões/mês, o Essencial paga-se sozinho com o desconto. E ainda tem o app completo." |
| "Não preciso do app" | "Muitos dos nossos pacientes dizem o mesmo — e depois usam-no todos os dias para os exercícios em casa." |
| "Posso cancelar quando quiser?" | "Sim, sem compromisso. Cancela a qualquer momento no app." |
| "Tenho seguro de saúde" | "O desconto é complementar — aplica-se ao valor pago por si, depois do seguro." |

---

## 10. Resumo Executivo

| | Grátis | Essencial | Activo | Total | B2B |
|---|:---:|:---:|:---:|:---:|:---:|
| Preço/mês | £0 | £9.99 | £29.99 | £49.99 | £99–499 |
| Desconto sessões | — | 10% | 20% | 30% | 15–20% |
| Sessão incluída | — | — | — | 1×/mês | — |
| App Premium | — | ✅ | ✅ | ✅ | ✅ |
| Chat especialista | — | — | ✅ | ✅ (prioritário) | ✅ |
| Público-alvo | Todos | Manutenção | Reabilitação activa | Total commitment | Empresas |

---

*Documento criado Jun 2026 — BPR Bruno Physical Rehabilitation*
*Uso interno — estratégia comercial e produto*

# QA Report — T-2: Navegação por abas

**Data:** 07/06/2026
**Resultado:** ✅ APROVADO (3/3 cenários)
**Ferramenta:** Playwright sobre Expo Web (`localhost:8081`).

## Resultados

| # | Cenário | Esperado | Obtido | OK |
|---|---------|----------|--------|----|
| 2.1 | Login → app | Tab bar com 4 abas | Início / Agenda / Exercícios / Perfil visíveis | ✅ |
| 2.2 | Tocar cada aba | Navega à tela | `/` (Início), `/appointments`, `/profile` — URLs corretas | ✅ |
| 2.3 | Console | Sem erros | 0 erros | ✅ |

## Evidências
- Screenshot: `qa/screenshots/t2-tabs-perfil.png`
- Sessão restaurada (bootstrap) mostrando "Olá, Sarah" + "Bruno Physical Rehab".
- Guarda de auth do grupo `(app)` mantida (abas só acessíveis autenticado).

## Estrutura
```
app/(app)/_layout.tsx            guarda de auth (mantida)
app/(app)/(tabs)/_layout.tsx     Tabs (4 abas, ícones emoji, cores de marca)
app/(app)/(tabs)/index.tsx       Início (home — T-3 enriquece)
app/(app)/(tabs)/appointments.tsx  esqueleto (T-4)
app/(app)/(tabs)/exercises.tsx     esqueleto (T-5)
app/(app)/(tabs)/profile.tsx       esqueleto + logout (T-6)
```

## Notas
- Removidos `app/index.tsx` (gate) e `app/(app)/home.tsx`: a home agora é a aba `index`
  (rota `/`), protegida pelo `(app)/_layout`. Login redireciona para `/`.
- Ícones via emoji (sem dependência nova `@expo/vector-icons`); trocável depois se quiser
  ícones de fonte.

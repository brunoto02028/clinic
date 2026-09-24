# T-12: Módulos e permissões por plano de assinatura

**Status:** pendente
**Depende de:** decidir o processador de pagamento

## Objetivo
O plano que o paciente assina decide o que ele vê no app.

## Contexto
O `plano-comercial.md` define três planos, e a diferença entre eles é exatamente quais dados
aparecem:

| Plano | Preço | O que libera |
|---|---|---|
| Essencial | £49 | exercício, check-in, mensagens. **Sem pressão** |
| Cardio | £59 | + pressão arterial e relatório |
| Performance | £79 | + sono, HRV, SpO2, ECG |

O mecanismo já existe: `MODULE_REGISTRY` (`mod_*`), `computePatientAccess`, e os módulos
`mod_messages` / `mod_devices` criados na ativ. 070. Falta o vínculo plano → conjunto de módulos, e
a assinatura que o alimenta.

## Passos
1. As chaves de módulo que faltam para separar os planos (`mod_blood_pressure`, `mod_sleep_hrv`).
2. O mapa plano → módulos, num lugar só e legível por humano.
3. Assinatura ativa concede; assinatura vencida **revoga no dia seguinte**, não na hora — cortar o
   acesso no meio de um dia já pago gera reclamação justa.
4. Dado já registrado continua existindo; o que muda é o que a tela mostra. Downgrade não apaga
   prontuário.
5. Tela do admin mostrando qual plano o paciente tem e o que ele libera.

## Arquivos afetados
- `lib/module-registry.ts`
- `lib/patient-access.ts`
- modelo de assinatura (a definir junto com o processador)

## Critérios de aceite
- [ ] Paciente no Essencial não vê pressão, no app nem na web
- [ ] Upgrade libera sem exigir novo login
- [ ] Downgrade não apaga nada
- [ ] Override manual do admin continua mandando mais que o plano

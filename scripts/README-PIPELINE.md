# BPR.REHAB — Pipeline de Automação

## Visão Geral

```
┌─────────────────────────────────────────────────────────────┐
│  VOCÊ + CASCADE (Windsurf)                                  │
│  → Implementa features, corrige bugs, faz deploy            │
│  → Faz git commit + push para GitHub                        │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  OLLAMA + AIDER (Local, Offline)                            │
│  → Revisa código automaticamente                            │
│  → Corrige erros de TypeScript                              │
│  → Faz code review com IA local (qwen3-coder:30b)          │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  GITHUB + VPS (bpr.rehab)                                   │
│  → Push automático para GitHub                              │
│  → SCP dos arquivos para VPS                                │
│  → Build + PM2 reload no servidor                           │
└─────────────────────────────────────────────────────────────┘
```

## Scripts Disponíveis

### 1. Pipeline Completo (review + deploy)
```powershell
.\scripts\clinic-pipeline.ps1
```
Executa tudo: type-check → Aider review → git push → deploy VPS.

### 2. Só Revisão (sem deploy)
```powershell
.\scripts\clinic-pipeline.ps1 -ReviewOnly
```
Roda type-check e Aider review, mas NÃO faz deploy.

### 3. Só Deploy (sem review)
```powershell
.\scripts\clinic-pipeline.ps1 -DeployOnly
```
Pula review e vai direto para git push + deploy VPS.

### 4. Review Interativo com Aider
```powershell
.\scripts\aider-review.ps1
```
Abre o Aider interativamente com os arquivos alterados.
Você conversa com a IA e aprova/rejeita cada mudança.

### 5. Aider Livre (modo chat)
```powershell
cd "c:\Bruno Projetos\Clinic\New Clinc\bruno_clinical_system\nextjs_space"
aider --model ollama/qwen3-coder:30b
```
Abre o Aider em modo livre para explorar/editar qualquer arquivo.

## Pré-requisitos

- **Ollama** rodando com modelo `qwen3-coder:30b`
- **Aider** instalado: `pip install aider-chat`
- **Git** configurado com remote GitHub
- **SSH** configurado para `root@bpr.rehab`

## Fluxo do Dia a Dia

1. Abra o **Windsurf** e trabalhe normalmente com o **Cascade**
2. Quando terminar uma sessão de trabalho, rode:
   ```powershell
   .\scripts\clinic-pipeline.ps1
   ```
3. O pipeline vai:
   - Verificar erros de TypeScript
   - Pedir ao Ollama/Aider para revisar e corrigir
   - Fazer commit + push para GitHub
   - Perguntar se quer fazer deploy para produção
   - Fazer deploy se confirmado

## Logs

Todos os logs ficam em `scripts/pipeline.log`.

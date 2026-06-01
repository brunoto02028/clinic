# 🚧 IMPLEMENTAÇÕES PENDENTES

**Data:** 01/06/2026  
**Status:** Parcialmente Implementado

---

## ✅ JÁ IMPLEMENTADO

### **1. Google Analytics 4** ✅
```
Arquivo: components/analytics/google-analytics.tsx
Status: Pronto
Configurar: Adicionar NEXT_PUBLIC_GA_ID no .env
```

### **2. Hotjar** ✅
```
Arquivo: components/analytics/hotjar.tsx
Status: Pronto
Configurar: Adicionar NEXT_PUBLIC_HOTJAR_ID no .env
```

### **3. Sistema de Backup** ✅
```
Arquivo: scripts/backup-database.sh
Documentação: BACKUP_GUIDE.md
Status: Pronto
Configurar: Cron job + variáveis de ambiente
```

### **4. FAQ Interativo** ✅
```
Arquivo: app/help/page.tsx
Status: Pronto
URL: /help
```

### **5. Web Vitals Monitoring** ✅
```
Arquivo: components/web-vitals.tsx
Status: Pronto e ativo
```

---

## ⏳ FALTA IMPLEMENTAR

### **1. Onboarding Tour (IMPORTANTE)**

**Criar arquivo:** `components/onboarding-tour.tsx`

```tsx
"use client";

import Joyride, { Step } from 'react-joyride';
import { useState, useEffect } from 'react';

const steps: Step[] = [
  {
    target: '.upload-button',
    content: 'Comece fazendo upload do scan do pé do paciente',
    disableBeacon: true,
  },
  {
    target: '.patient-list',
    content: 'Aqui você vê todos os seus pacientes',
  },
  {
    target: '.scan-viewer',
    content: 'Visualize o scan em 3D e faça análises',
  },
  {
    target: '.generate-insoles',
    content: 'Gere palmilhas customizadas automaticamente',
  },
];

export function OnboardingTour() {
  const [run, setRun] = useState(false);

  useEffect(() => {
    // Verificar se é primeira vez do usuário
    const hasSeenTour = localStorage.getItem('hasSeenOnboardingTour');
    if (!hasSeenTour) {
      setRun(true);
    }
  }, []);

  const handleJoyrideCallback = (data: any) => {
    const { status } = data;
    if (status === 'finished' || status === 'skipped') {
      localStorage.setItem('hasSeenOnboardingTour', 'true');
      setRun(false);
    }
  };

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      showProgress
      showSkipButton
      callback={handleJoyrideCallback}
      styles={{
        options: {
          primaryColor: '#10b981',
          zIndex: 10000,
        },
      }}
    />
  );
}
```

**Adicionar em:** `app/admin/page.tsx` ou `app/dashboard/page.tsx`

```tsx
import { OnboardingTour } from '@/components/onboarding-tour';

// No componente
<OnboardingTour />
```

---

### **2. Modo Simple vs Advanced (IMPORTANTE)**

**Criar arquivo:** `components/mode-switcher.tsx`

```tsx
"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Settings, Zap } from 'lucide-react';

export function ModeSwitcher() {
  const [mode, setMode] = useState<'simple' | 'advanced'>('simple');

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={mode === 'simple' ? 'default' : 'outline'}
        size="sm"
        onClick={() => setMode('simple')}
      >
        <Zap className="h-4 w-4 mr-2" />
        Simples
      </Button>
      <Button
        variant={mode === 'advanced' ? 'default' : 'outline'}
        size="sm"
        onClick={() => setMode('advanced')}
      >
        <Settings className="h-4 w-4 mr-2" />
        Avançado
      </Button>
    </div>
  );
}
```

**Usar em componentes:**

```tsx
const [mode] = useMode(); // Custom hook

{mode === 'simple' ? (
  <SimpleWorkflow />
) : (
  <AdvancedWorkflow />
)}
```

---

### **3. Pricing e Paywall (CRÍTICO)**

**Criar arquivo:** `app/pricing/page.tsx`

```tsx
export default function PricingPage() {
  const plans = [
    {
      name: 'Starter',
      price: '£49',
      features: [
        '1 terapeuta',
        '20 pacientes',
        '50 scans/mês',
        'Suporte email',
      ],
    },
    {
      name: 'Professional',
      price: '£149',
      popular: true,
      features: [
        '3 terapeutas',
        '100 pacientes',
        'Scans ilimitados',
        'Suporte prioritário',
        'White label',
      ],
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      features: [
        'Terapeutas ilimitados',
        'Pacientes ilimitados',
        'API access',
        'Suporte dedicado',
      ],
    },
  ];

  return (
    <div className="grid md:grid-cols-3 gap-8">
      {plans.map(plan => (
        <PricingCard key={plan.name} {...plan} />
      ))}
    </div>
  );
}
```

**Criar paywall:** `components/paywall.tsx`

```tsx
export function Paywall({ feature }: { feature: string }) {
  const { subscription } = useSubscription();

  if (!subscription || subscription.plan === 'FREE') {
    return (
      <Card>
        <CardHeader>
          <Lock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <CardTitle>Upgrade Necessário</CardTitle>
          <CardDescription>
            {feature} está disponível apenas em planos pagos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <Link href="/pricing">Ver Planos</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return null;
}
```

---

### **4. Help Contextual com Tooltips (MÉDIO)**

**Criar arquivo:** `components/help-tooltip.tsx`

```tsx
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";

export function HelpTooltip({ content }: { content: string }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button className="inline-flex items-center">
            <HelpCircle className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p className="max-w-xs">{content}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
```

**Usar:**

```tsx
<div className="flex items-center gap-2">
  <Label>Arch Index</Label>
  <HelpTooltip content="Razão entre área do mediopé e área total. Normal: 0.21-0.26" />
</div>
```

---

### **5. Vídeos Tutoriais (MÉDIO)**

**Criar pasta:** `public/videos/`

**Gravar vídeos curtos (15-30s):**
- upload-scan.mp4
- generate-insoles.mp4
- patient-portal.mp4

**Usar Loom (grátis):** https://loom.com

**Embedar:**

```tsx
<video controls className="w-full rounded-lg">
  <source src="/videos/upload-scan.mp4" type="video/mp4" />
</video>
```

---

### **6. Configurar Variáveis de Ambiente**

**Adicionar ao `.env.local`:**

```bash
# Analytics
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
NEXT_PUBLIC_HOTJAR_ID=1234567

# Backup
BACKUP_DIR=./backups/database
RETENTION_DAYS=30

# S3 (Opcional)
S3_BUCKET=bpr-clinic-backups
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_REGION=eu-west-2
```

**Adicionar ao Railway:**

```bash
railway variables set NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
railway variables set NEXT_PUBLIC_HOTJAR_ID=1234567
```

---

### **7. Configurar Cron Job para Backup**

**No servidor (se tiver acesso SSH):**

```bash
crontab -e

# Adicionar:
0 2 * * * cd /path/to/clinic && ./scripts/backup-database.sh >> /var/log/backup.log 2>&1
```

**Alternativa: GitHub Actions**

Criar `.github/workflows/backup.yml`:

```yaml
name: Database Backup

on:
  schedule:
    - cron: '0 2 * * *'  # Diariamente às 2AM
  workflow_dispatch:  # Manual trigger

jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Run Backup
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
        run: |
          chmod +x scripts/backup-database.sh
          ./scripts/backup-database.sh
      
      - name: Upload to S3
        uses: aws-actions/configure-aws-credentials@v1
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: eu-west-2
```

---

### **8. Criar Conteúdo SEO (IMPORTANTE)**

**Artigos para escrever:**

1. "Como Palmilhas Customizadas Ajudam na Reabilitação"
2. "Tecnologia 3D em Fisioterapia: O Futuro é Agora"
3. "Biomecânica do Pé Explicada"
4. "Casos de Sucesso: Antes e Depois"
5. "Guia Completo de Análise de Marcha"

**Usar AI para gerar:**

```bash
# Já tem sistema de geração de artigos!
# Usar o AI Article Generator no admin
```

---

### **9. Google My Business**

**Passos:**

1. Ir para https://business.google.com
2. Criar perfil da clínica
3. Adicionar:
   - Endereço
   - Telefone
   - Horário
   - Fotos
   - Descrição
4. Pedir reviews de pacientes
5. Postar atualizações semanais

---

### **10. Teste de Restore de Backup**

**Executar mensalmente:**

```bash
# Criar database de teste
createdb test_restore

# Restore último backup
gunzip -c backups/database/backup_latest.sql.gz | psql test_restore

# Verificar
psql test_restore -c "SELECT COUNT(*) FROM \"User\";"

# Limpar
dropdb test_restore
```

---

## 📋 CHECKLIST DE IMPLEMENTAÇÃO

### **Esta Semana:**
- [ ] Configurar Google Analytics ID
- [ ] Configurar Hotjar ID
- [ ] Configurar cron job de backup
- [ ] Testar backup manual
- [ ] Adicionar HelpTooltip em 5 lugares
- [ ] Criar 1 vídeo tutorial

### **Próxima Semana:**
- [ ] Implementar OnboardingTour
- [ ] Implementar ModeSwitcher
- [ ] Criar página de Pricing
- [ ] Implementar Paywall básico
- [ ] Escrever 1 artigo SEO

### **Mês 1:**
- [ ] 5 beta testers
- [ ] Google My Business
- [ ] 4 artigos SEO
- [ ] 3 vídeos tutoriais
- [ ] Primeiros clientes pagantes

---

## 🎯 PRIORIDADES

### **CRÍTICO (Fazer Hoje):**
1. Configurar Analytics (30 min)
2. Configurar Backup (1 hora)
3. Testar backup (15 min)

### **IMPORTANTE (Esta Semana):**
4. Onboarding Tour (2 horas)
5. Pricing Page (3 horas)
6. Help Tooltips (1 hora)

### **DESEJÁVEL (Próximas 2 Semanas):**
7. Modo Simple/Advanced (4 horas)
8. Vídeos Tutoriais (4 horas)
9. Conteúdo SEO (6 horas)

---

## 📞 PRÓXIMOS PASSOS

1. **Configurar variáveis de ambiente**
2. **Testar Analytics em produção**
3. **Executar primeiro backup**
4. **Implementar Onboarding Tour**
5. **Criar página de Pricing**
6. **Começar beta testing**

---

**IMPORTANTE: Foque em validação com usuários reais antes de implementar tudo!** 🎯

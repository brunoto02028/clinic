# OpenClaw Agent API - BPR.rehab

Sistema de API para integração com OpenClaw Agent rodando localmente no PC Windows.

## 🎯 Visão Geral

O OpenClaw Agent funciona como um **"Cérebro Central"** (Master Agent) rodando no seu PC Windows (porta 18789), controlando:
- ✅ Gestão de redes sociais (Instagram)
- ✅ Leads e novos contatos
- ✅ Dados de pacientes
- ✅ Sugestões e correções automáticas

O Agent se comunica com a VPS da clínica (bpr.rehab) via API REST usando autenticação por API Key.

## 🔐 Autenticação

Todas as requisições devem incluir o header de autorização:

```
Authorization: Bearer bpr_agent_YOUR_API_KEY_HERE
```

## 📍 Base URL

```
https://bpr.rehab/api/agent
```

## 🔑 Gerenciamento de API Keys

### Criar Nova API Key

1. Acesse o painel admin: `https://bpr.rehab/admin/agent-keys`
2. Clique em "New API Key"
3. Configure:
   - **Name**: Nome descritivo (ex: "OpenClaw Marketing Agent")
   - **Permissions**: Selecione as permissões necessárias
     - `instagram`: Publicar posts no Instagram
     - `leads`: Acessar lista de leads/contatos
     - `patients`: Acessar dados de pacientes
     - `appointments`: Gerenciar agendamentos (futuro)
     - `analytics`: Acessar analytics (futuro)
   - **Expires In**: Dias até expiração (0 = nunca expira)
4. Clique em "Create Key"
5. **IMPORTANTE**: Copie a API Key imediatamente - ela não será mostrada novamente!

### Gerenciar Keys Existentes

- **Ativar/Desativar**: Toggle switch ao lado de cada key
- **Deletar**: Botão de lixeira (ação irreversível)
- **Ver última utilização**: Timestamp atualizado automaticamente

## 📡 Endpoints Disponíveis

### 1. Publicar Post no Instagram

**Endpoint**: `POST /api/agent/instagram/publish`

**Permissão necessária**: `instagram`

**Body (JSON)**:
```json
{
  "caption": "Texto do post aqui 🔥",
  "imageUrl": "https://example.com/image.jpg",
  "scheduleAt": "2026-03-20T10:00:00Z"  // Opcional
}
```

**Resposta (sucesso imediato)**:
```json
{
  "success": true,
  "post": {
    "id": "clxxx123",
    "status": "PUBLISHED",
    "instagramPostId": "18123456789"
  }
}
```

**Resposta (agendado)**:
```json
{
  "success": true,
  "post": {
    "id": "clxxx123",
    "status": "SCHEDULED",
    "scheduledFor": "2026-03-20T10:00:00Z"
  }
}
```

**Exemplo Python**:
```python
import requests

API_KEY = "bpr_agent_..."
BASE_URL = "https://bpr.rehab/api/agent"

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

response = requests.post(
    f"{BASE_URL}/instagram/publish",
    headers=headers,
    json={
        "caption": "💪 Novo tratamento disponível!\n\n#fisioterapia #bpr",
        "imageUrl": "https://example.com/treatment.jpg"
    }
)

print(response.json())
```

---

### 2. Buscar Leads/Contatos

**Endpoint**: `GET /api/agent/leads`

**Permissão necessária**: `leads`

**Query Parameters**:
- `limit` (default: 50): Número máximo de leads
- `status`: Filtro por status
  - `new`: Leads novos (não verificaram email)
  - `contacted`: Verificaram email mas não completaram perfil
  - `converted`: Completaram perfil
- `daysAgo` (default: 7): Leads dos últimos X dias

**Exemplo**:
```
GET /api/agent/leads?limit=100&status=new&daysAgo=7
```

**Resposta**:
```json
{
  "leads": [
    {
      "id": "clxxx123",
      "email": "joao@example.com",
      "name": "João Silva",
      "phone": "+351912345678",
      "createdAt": "2026-03-15T10:30:00Z",
      "status": "new",
      "hasAppointment": false,
      "lastAppointment": null
    }
  ],
  "total": 15,
  "filters": {
    "limit": 100,
    "status": "new",
    "daysAgo": 7
  }
}
```

**Exemplo Python**:
```python
# Buscar leads novos dos últimos 3 dias
leads = requests.get(
    f"{BASE_URL}/leads?status=new&daysAgo=3",
    headers=headers
)

for lead in leads.json()['leads']:
    print(f"Novo lead: {lead['name']} - {lead['email']}")
```

---

### 3. Buscar Dados de Pacientes

**Endpoint**: `GET /api/agent/patients`

**Permissão necessária**: `patients`

**Query Parameters**:
- `limit` (default: 100): Número máximo de pacientes
- `search`: Buscar por nome, email ou telefone
- `includeInactive` (default: false): Incluir pacientes inativos

**Exemplo**:
```
GET /api/agent/patients?search=maria&limit=50
```

**Resposta**:
```json
{
  "patients": [
    {
      "id": "clxxx456",
      "email": "maria@example.com",
      "name": "Maria Santos",
      "phone": "+351923456789",
      "dateOfBirth": "1985-05-15T00:00:00Z",
      "address": "Rua Example, 123, Lisboa",
      "createdAt": "2025-01-10T09:00:00Z",
      "isActive": true,
      "profileCompleted": true,
      "totalAppointments": 12,
      "recentAppointments": [
        {
          "id": "apt123",
          "date": "2026-03-10T14:00:00Z",
          "status": "COMPLETED",
          "therapist": "Dr. Bruno Toaz"
        }
      ]
    }
  ],
  "total": 1,
  "filters": {
    "limit": 50,
    "search": "maria",
    "includeInactive": false
  }
}
```

**Exemplo Python**:
```python
# Buscar todos os pacientes ativos
patients = requests.get(
    f"{BASE_URL}/patients?limit=200",
    headers=headers
)

for patient in patients.json()['patients']:
    print(f"{patient['name']}: {patient['totalAppointments']} consultas")
```

---

## 🤖 Exemplo Completo: OpenClaw Agent Script

```python
#!/usr/bin/env python3
"""
OpenClaw Marketing Agent
Gera e publica conteúdo automaticamente no Instagram da BPR.rehab
"""

import requests
import json
from datetime import datetime, timedelta

# Configuração
API_KEY = "bpr_agent_YOUR_KEY_HERE"
BASE_URL = "https://bpr.rehab/api/agent"

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

def get_new_leads():
    """Busca leads novos dos últimos 7 dias"""
    response = requests.get(
        f"{BASE_URL}/leads?status=new&daysAgo=7",
        headers=headers
    )
    return response.json()['leads']

def publish_instagram_post(caption, image_url, schedule_time=None):
    """Publica post no Instagram"""
    data = {
        "caption": caption,
        "imageUrl": image_url
    }
    
    if schedule_time:
        data["scheduleAt"] = schedule_time.isoformat()
    
    response = requests.post(
        f"{BASE_URL}/instagram/publish",
        headers=headers,
        json=data
    )
    
    return response.json()

def generate_marketing_content():
    """Gera conteúdo de marketing baseado em leads"""
    leads = get_new_leads()
    
    if len(leads) > 10:
        # Muitos leads novos - criar post de boas-vindas
        caption = f"""
🎉 Bem-vindos aos {len(leads)} novos membros da família BPR!

Estamos aqui para ajudar na sua jornada de recuperação 💪

📞 Agende sua primeira consulta
🏥 Tratamentos personalizados
✨ Resultados comprovados

#fisioterapia #bpr #saude #bemestar
        """.strip()
        
        # Publicar imediatamente
        result = publish_instagram_post(
            caption=caption,
            image_url="https://bpr.rehab/images/welcome.jpg"
        )
        
        print(f"Post publicado: {result}")
    
    else:
        print(f"Apenas {len(leads)} leads novos. Aguardando mais para criar post.")

def schedule_weekly_tips():
    """Agenda dicas semanais de saúde"""
    tips = [
        ("Segunda", "💪 Dica: Alongue-se por 10 minutos ao acordar!"),
        ("Quarta", "🧘 Dica: Mantenha uma postura correta ao trabalhar!"),
        ("Sexta", "🏃 Dica: Caminhe 30 minutos por dia!")
    ]
    
    for day, tip in tips:
        # Agendar para próxima ocorrência do dia
        schedule_time = datetime.now() + timedelta(days=1)
        
        result = publish_instagram_post(
            caption=f"{tip}\n\n#bpr #fisioterapia #saude",
            image_url="https://bpr.rehab/images/tips.jpg",
            schedule_time=schedule_time
        )
        
        print(f"Agendado para {day}: {result}")

if __name__ == "__main__":
    print("🤖 OpenClaw Marketing Agent - Iniciando...")
    
    # Gerar conteúdo baseado em leads
    generate_marketing_content()
    
    # Agendar dicas semanais
    schedule_weekly_tips()
    
    print("✅ Tarefas concluídas!")
```

---

## 🔒 Segurança

### Boas Práticas

1. **Nunca compartilhe sua API Key**
2. **Use variáveis de ambiente** para armazenar a key:
   ```python
   import os
   API_KEY = os.getenv('BPR_AGENT_API_KEY')
   ```
3. **Revogue keys comprometidas** imediatamente no painel admin
4. **Use keys com permissões mínimas** necessárias
5. **Configure expiração** para keys temporárias

### Rate Limiting

- Máximo de **100 requisições por minuto** por API Key
- Máximo de **1000 requisições por hora** por API Key

### Erros Comuns

**401 Unauthorized**:
```json
{
  "error": "Invalid or missing API key"
}
```
→ Verifique se o header Authorization está correto

**403 Forbidden**:
```json
{
  "error": "Permission denied: instagram access required"
}
```
→ A API Key não tem a permissão necessária

**429 Too Many Requests**:
```json
{
  "error": "Rate limit exceeded"
}
```
→ Aguarde antes de fazer mais requisições

---

## 🚀 Deploy e Manutenção

### Estrutura de Arquivos

```
/lib/agent-auth.ts                          # Autenticação e validação
/app/api/admin/agent-keys/route.ts          # Admin: gerenciar keys
/app/api/agent/instagram/publish/route.ts   # Agent: publicar Instagram
/app/api/agent/leads/route.ts               # Agent: buscar leads
/app/api/agent/patients/route.ts            # Agent: buscar pacientes
/app/admin/agent-keys/page.tsx              # UI: painel de keys
/prisma/schema.prisma                       # Modelo AgentApiKey
```

### Banco de Dados

Modelo `AgentApiKey`:
- `id`: ID único
- `name`: Nome descritivo
- `key`: API Key (único)
- `permissions`: JSON com permissões
- `isActive`: Ativo/inativo
- `lastUsedAt`: Última utilização
- `expiresAt`: Data de expiração
- `createdAt`: Data de criação
- `createdById`: Quem criou

---

## 📞 Suporte

Para dúvidas ou problemas:
1. Verifique os logs no painel admin
2. Teste endpoints com curl/Postman
3. Revise as permissões da API Key
4. Consulte a documentação completa

---

## 🎯 Roadmap Futuro

- [ ] Endpoint para criar/editar agendamentos
- [ ] Endpoint para analytics e métricas
- [ ] Webhook para notificações em tempo real
- [ ] Suporte para Facebook e outras redes sociais
- [ ] Rate limiting configurável por key
- [ ] Logs detalhados de uso por endpoint

---

**Última atualização**: 17 de Março de 2026
**Versão da API**: 1.0.0

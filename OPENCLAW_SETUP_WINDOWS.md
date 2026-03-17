# OpenClaw Agent - Setup Completo para Windows

## 🎯 Sua API Key (FULL ACCESS)

```
bpr_agent_17e9c3e46dc5fc154d5a5d132d09c2b6cd3f327f543a1b0080558ccfec9c5aae
```

**Permissões**: ✅ Instagram | ✅ Leads | ✅ Patients | ✅ Appointments | ✅ Analytics

---

## 📋 Passo 1: Configurar Variáveis de Ambiente no Windows

### Opção A: Via PowerShell (Recomendado)

```powershell
# Abrir PowerShell como Administrador e executar:
[System.Environment]::SetEnvironmentVariable('BPR_API_KEY', 'bpr_agent_17e9c3e46dc5fc154d5a5d132d09c2b6cd3f327f543a1b0080558ccfec9c5aae', 'User')
[System.Environment]::SetEnvironmentVariable('BPR_BASE_URL', 'https://bpr.rehab/api/agent', 'User')
```

### Opção B: Via Interface Gráfica

1. Pressione `Win + R`
2. Digite `sysdm.cpl` e pressione Enter
3. Vá para a aba "Avançado"
4. Clique em "Variáveis de Ambiente"
5. Em "Variáveis do usuário", clique em "Novo"
6. Adicione:
   - **Nome**: `BPR_API_KEY`
   - **Valor**: `bpr_agent_17e9c3e46dc5fc154d5a5d132d09c2b6cd3f327f543a1b0080558ccfec9c5aae`
7. Adicione outra:
   - **Nome**: `BPR_BASE_URL`
   - **Valor**: `https://bpr.rehab/api/agent`

### Opção C: Arquivo `.env` (Para OpenClaw)

Crie um arquivo `.env` na pasta do OpenClaw:

```env
BPR_API_KEY=bpr_agent_17e9c3e46dc5fc154d5a5d132d09c2b6cd3f327f543a1b0080558ccfec9c5aae
BPR_BASE_URL=https://bpr.rehab/api/agent
```

---

## 📋 Passo 2: Instalar Dependências Python

```powershell
# Instalar requests (se ainda não tiver)
pip install requests python-dotenv
```

---

## 📋 Passo 3: Testar Conexão

Salve o script abaixo como `test_bpr_connection.py`:

```python
import os
import requests
from dotenv import load_dotenv

# Carregar variáveis de ambiente
load_dotenv()

API_KEY = os.getenv('BPR_API_KEY')
BASE_URL = os.getenv('BPR_BASE_URL', 'https://bpr.rehab/api/agent')

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

def test_connection():
    """Testa conexão com a API BPR"""
    print("🔍 Testando conexão com BPR.rehab...")
    print(f"URL: {BASE_URL}")
    print(f"API Key: {API_KEY[:20]}...{API_KEY[-10:]}")
    print()
    
    # Teste 1: Buscar leads
    print("📊 Teste 1: Buscar leads novos...")
    try:
        response = requests.get(
            f"{BASE_URL}/leads?status=new&daysAgo=30&limit=5",
            headers=headers,
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Sucesso! Encontrados {data['total']} leads")
            for lead in data['leads'][:3]:
                print(f"  - {lead['name']} ({lead['email']}) - Status: {lead['status']}")
        else:
            print(f"❌ Erro {response.status_code}: {response.text}")
    except Exception as e:
        print(f"❌ Erro na conexão: {e}")
    
    print()
    
    # Teste 2: Buscar pacientes
    print("👥 Teste 2: Buscar pacientes...")
    try:
        response = requests.get(
            f"{BASE_URL}/patients?limit=5",
            headers=headers,
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Sucesso! Encontrados {data['total']} pacientes")
            for patient in data['patients'][:3]:
                print(f"  - {patient['name']} - {patient['totalAppointments']} consultas")
        else:
            print(f"❌ Erro {response.status_code}: {response.text}")
    except Exception as e:
        print(f"❌ Erro na conexão: {e}")
    
    print()
    print("✅ Testes concluídos!")

if __name__ == "__main__":
    test_connection()
```

Execute:
```powershell
python test_bpr_connection.py
```

---

## 📋 Passo 4: Agentes OpenClaw

### Agente 1: Marketing Manager (Instagram)

Salve como `agent_marketing.py`:

```python
import os
import requests
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv('BPR_API_KEY')
BASE_URL = os.getenv('BPR_BASE_URL', 'https://bpr.rehab/api/agent')

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

class MarketingAgent:
    """Agente de Marketing - Gerencia posts do Instagram"""
    
    def get_new_leads_count(self):
        """Conta quantos leads novos temos"""
        response = requests.get(
            f"{BASE_URL}/leads?status=new&daysAgo=7",
            headers=headers
        )
        if response.status_code == 200:
            return response.json()['total']
        return 0
    
    def create_welcome_post(self, leads_count):
        """Cria post de boas-vindas para novos leads"""
        caption = f"""
🎉 Bem-vindos aos {leads_count} novos membros da família BPR!

Estamos aqui para ajudar na sua jornada de recuperação 💪

📞 Agende sua primeira consulta
🏥 Tratamentos personalizados
✨ Resultados comprovados

#fisioterapia #bpr #saude #bemestar #ipswich #suffolk
        """.strip()
        
        return self.publish_post(caption, "https://bpr.rehab/images/welcome.jpg")
    
    def publish_post(self, caption, image_url, schedule_time=None):
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
    
    def run(self):
        """Executa rotina do agente"""
        print("🤖 Marketing Agent - Iniciando...")
        
        # Verificar leads novos
        leads_count = self.get_new_leads_count()
        print(f"📊 Leads novos (últimos 7 dias): {leads_count}")
        
        if leads_count >= 5:
            print("📸 Criando post de boas-vindas...")
            result = self.create_welcome_post(leads_count)
            print(f"✅ Post criado: {result}")
        else:
            print("⏳ Aguardando mais leads para criar post...")
        
        print("✅ Marketing Agent - Concluído!")

if __name__ == "__main__":
    agent = MarketingAgent()
    agent.run()
```

### Agente 2: Sales Manager (Leads)

Salve como `agent_sales.py`:

```python
import os
import requests
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv('BPR_API_KEY')
BASE_URL = os.getenv('BPR_BASE_URL', 'https://bpr.rehab/api/agent')

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

class SalesAgent:
    """Agente de Vendas - Gerencia leads e follow-ups"""
    
    def get_new_leads(self):
        """Busca leads novos"""
        response = requests.get(
            f"{BASE_URL}/leads?status=new&daysAgo=7&limit=50",
            headers=headers
        )
        if response.status_code == 200:
            return response.json()['leads']
        return []
    
    def get_contacted_leads(self):
        """Busca leads já contatados mas não convertidos"""
        response = requests.get(
            f"{BASE_URL}/leads?status=contacted&daysAgo=30&limit=50",
            headers=headers
        )
        if response.status_code == 200:
            return response.json()['leads']
        return []
    
    def analyze_leads(self, leads):
        """Analisa leads e gera relatório"""
        report = {
            'total': len(leads),
            'with_phone': sum(1 for l in leads if l.get('phone')),
            'with_appointment': sum(1 for l in leads if l.get('hasAppointment')),
            'priority': []
        }
        
        # Leads prioritários (sem agendamento)
        for lead in leads:
            if not lead.get('hasAppointment'):
                report['priority'].append({
                    'name': lead['name'],
                    'email': lead['email'],
                    'phone': lead.get('phone'),
                    'days_since_signup': (datetime.now() - datetime.fromisoformat(lead['createdAt'].replace('Z', '+00:00'))).days
                })
        
        return report
    
    def run(self):
        """Executa rotina do agente"""
        print("🤖 Sales Agent - Iniciando...")
        
        # Buscar leads novos
        new_leads = self.get_new_leads()
        print(f"📊 Leads novos: {len(new_leads)}")
        
        if new_leads:
            report = self.analyze_leads(new_leads)
            print(f"\n📈 Relatório de Leads:")
            print(f"  Total: {report['total']}")
            print(f"  Com telefone: {report['with_phone']}")
            print(f"  Com agendamento: {report['with_appointment']}")
            print(f"  Prioritários (sem agendamento): {len(report['priority'])}")
            
            if report['priority']:
                print(f"\n🎯 Top 5 Leads Prioritários:")
                for lead in report['priority'][:5]:
                    print(f"  - {lead['name']} ({lead['email']})")
                    print(f"    Telefone: {lead['phone'] or 'N/A'}")
                    print(f"    Dias desde cadastro: {lead['days_since_signup']}")
                    print()
        
        # Buscar leads contatados
        contacted = self.get_contacted_leads()
        print(f"\n📞 Leads contatados (aguardando conversão): {len(contacted)}")
        
        print("\n✅ Sales Agent - Concluído!")

if __name__ == "__main__":
    agent = SalesAgent()
    agent.run()
```

### Agente 3: Patient Care Manager

Salve como `agent_patient_care.py`:

```python
import os
import requests
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv('BPR_API_KEY')
BASE_URL = os.getenv('BPR_BASE_URL', 'https://bpr.rehab/api/agent')

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

class PatientCareAgent:
    """Agente de Cuidado ao Paciente - Monitora pacientes ativos"""
    
    def get_active_patients(self):
        """Busca pacientes ativos"""
        response = requests.get(
            f"{BASE_URL}/patients?limit=200&includeInactive=false",
            headers=headers
        )
        if response.status_code == 200:
            return response.json()['patients']
        return []
    
    def analyze_patient_engagement(self, patients):
        """Analisa engajamento dos pacientes"""
        report = {
            'total': len(patients),
            'active': 0,
            'at_risk': [],
            'highly_engaged': []
        }
        
        for patient in patients:
            appointments = patient.get('totalAppointments', 0)
            recent = patient.get('recentAppointments', [])
            
            if appointments >= 5:
                report['highly_engaged'].append(patient)
            elif appointments == 0 or (recent and (datetime.now() - datetime.fromisoformat(recent[0]['date'].replace('Z', '+00:00'))).days > 60):
                report['at_risk'].append(patient)
            else:
                report['active'] += 1
        
        return report
    
    def run(self):
        """Executa rotina do agente"""
        print("🤖 Patient Care Agent - Iniciando...")
        
        patients = self.get_active_patients()
        print(f"👥 Pacientes ativos: {len(patients)}")
        
        if patients:
            report = self.analyze_patient_engagement(patients)
            
            print(f"\n📊 Análise de Engajamento:")
            print(f"  Total: {report['total']}")
            print(f"  Ativos: {report['active']}")
            print(f"  Altamente engajados: {len(report['highly_engaged'])}")
            print(f"  Em risco (sem consulta recente): {len(report['at_risk'])}")
            
            if report['at_risk']:
                print(f"\n⚠️ Pacientes em Risco (Top 5):")
                for patient in report['at_risk'][:5]:
                    print(f"  - {patient['name']} ({patient['email']})")
                    print(f"    Total consultas: {patient['totalAppointments']}")
                    if patient['recentAppointments']:
                        last_apt = patient['recentAppointments'][0]
                        print(f"    Última consulta: {last_apt['date'][:10]}")
                    print()
        
        print("✅ Patient Care Agent - Concluído!")

if __name__ == "__main__":
    agent = PatientCareAgent()
    agent.run()
```

---

## 📋 Passo 5: Agendar Execução Automática (Windows Task Scheduler)

### Via PowerShell:

```powershell
# Criar tarefa para Marketing Agent (executa diariamente às 9h)
$action = New-ScheduledTaskAction -Execute "python" -Argument "C:\caminho\para\agent_marketing.py"
$trigger = New-ScheduledTaskTrigger -Daily -At 9am
Register-ScheduledTask -Action $action -Trigger $trigger -TaskName "BPR Marketing Agent" -Description "OpenClaw Marketing Agent"

# Criar tarefa para Sales Agent (executa a cada 4 horas)
$action = New-ScheduledTaskAction -Execute "python" -Argument "C:\caminho\para\agent_sales.py"
$trigger = New-ScheduledTaskTrigger -Once -At 8am -RepetitionInterval (New-TimeSpan -Hours 4) -RepetitionDuration (New-TimeSpan -Days 365)
Register-ScheduledTask -Action $action -Trigger $trigger -TaskName "BPR Sales Agent" -Description "OpenClaw Sales Agent"

# Criar tarefa para Patient Care Agent (executa diariamente às 18h)
$action = New-ScheduledTaskAction -Execute "python" -Argument "C:\caminho\para\agent_patient_care.py"
$trigger = New-ScheduledTaskTrigger -Daily -At 6pm
Register-ScheduledTask -Action $action -Trigger $trigger -TaskName "BPR Patient Care Agent" -Description "OpenClaw Patient Care Agent"
```

---

## 🔐 Segurança

1. **NUNCA compartilhe sua API Key**
2. **Guarde em local seguro** (gerenciador de senhas)
3. **Use variáveis de ambiente** (não hardcode no código)
4. **Monitore uso** via painel admin: `https://bpr.rehab/admin/agent-keys`
5. **Revogue imediatamente** se comprometida

---

## 📞 Suporte

- **Painel Admin**: `https://bpr.rehab/admin/agent-keys`
- **Documentação API**: `/OPENCLAW_AGENT_API.md`
- **Logs de uso**: Visíveis no painel admin

---

## 🎯 Próximos Passos

1. ✅ Configurar variáveis de ambiente
2. ✅ Testar conexão com `test_bpr_connection.py`
3. ✅ Executar agentes manualmente para testar
4. ✅ Agendar execução automática
5. ✅ Monitorar resultados no painel admin
6. 🚀 Expandir com mais agentes conforme necessário

---

**Sistema pronto para uso! Seus agentes OpenClaw agora têm controle total do BPR.rehab! 🎉**

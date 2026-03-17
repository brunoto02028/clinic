# OpenClaw Examples - BPR.rehab

Scripts de exemplo para integração do OpenClaw Agent com BPR.rehab.

## 🚀 Quick Start

1. **Instalar dependências:**
```bash
pip install requests python-dotenv
```

2. **Configurar API Key:**
```bash
# Windows PowerShell
$env:BPR_API_KEY="bpr_agent_17e9c3e46dc5fc154d5a5d132d09c2b6cd3f327f543a1b0080558ccfec9c5aae"

# Linux/Mac
export BPR_API_KEY="bpr_agent_17e9c3e46dc5fc154d5a5d132d09c2b6cd3f327f543a1b0080558ccfec9c5aae"
```

3. **Testar conexão:**
```bash
python test_connection.py
```

## 📁 Arquivos

- `test_connection.py` - Testa conexão e permissões da API
- `env_template.txt` - Template de variáveis de ambiente

## 📚 Documentação Completa

Consulte os arquivos na raiz do projeto:
- `OPENCLAW_AGENT_API.md` - Documentação completa da API
- `OPENCLAW_SETUP_WINDOWS.md` - Setup completo para Windows com agentes de exemplo

## 🔑 Sua API Key

```
bpr_agent_17e9c3e46dc5fc154d5a5d132d09c2b6cd3f327f543a1b0080558ccfec9c5aae
```

**Permissões**: Full Access (Instagram, Leads, Patients, Appointments, Analytics)

## 🛡️ Segurança

- NUNCA commite a API Key no Git
- Use variáveis de ambiente
- Guarde em local seguro
- Monitore uso em: https://bpr.rehab/admin/agent-keys

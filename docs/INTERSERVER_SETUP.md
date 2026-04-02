# InterServer Storage Setup

## 📋 Credenciais Necessárias

Preencha as informações abaixo com os dados do seu InterServer:

### 1. Acesso FTP/SFTP
```bash
INTERSERVER_HOST=ftp.interserver.net  # ou seu domínio/IP
INTERSERVER_PORT=21                    # 21 para FTP, 22 para SFTP
INTERSERVER_USER=seu_usuario
INTERSERVER_PASSWORD=sua_senha
INTERSERVER_PROTOCOL=ftp              # ftp ou sftp
```

### 2. Diretórios
```bash
# Diretório onde as imagens serão salvas no servidor
INTERSERVER_UPLOAD_DIR=/public_html/uploads/

# URL pública para acessar as imagens
INTERSERVER_PUBLIC_URL=https://seudominio.com/uploads/
```

## 🔍 Como Encontrar no InterServer

1. **Login:** https://www.interserver.net/login
2. **Painel de Controle** → **FTP Accounts**
3. Copie as credenciais FTP
4. Verifique o caminho do `public_html` ou `www`

## 🚀 Configurar no Railway

Depois de preencher acima, configure no Railway:

```bash
railway variables --set INTERSERVER_HOST=ftp.interserver.net
railway variables --set INTERSERVER_PORT=21
railway variables --set INTERSERVER_USER=seu_usuario
railway variables --set INTERSERVER_PASSWORD=sua_senha
railway variables --set INTERSERVER_PROTOCOL=ftp
railway variables --set INTERSERVER_UPLOAD_DIR=/public_html/uploads/
railway variables --set INTERSERVER_PUBLIC_URL=https://seudominio.com/uploads/
```

## ✅ Status Atual

**Sistema funcionando com data URLs** (base64) - 100% operacional
- ✅ Upload funciona
- ✅ Delete funciona
- ✅ Sem dependência externa
- ✅ Compatível com Railway

**InterServer** - Aguardando configuração
- ⏳ Credenciais necessárias
- ⏳ Código pronto para implementar
- ⏳ Melhor performance quando configurado

## 💡 Recomendação

**Opção 1 (Recomendada):** Testar sistema atual com data URLs primeiro
- Já funciona 100%
- Sem configuração adicional
- Configurar InterServer depois para melhor performance

**Opção 2:** Configurar InterServer agora
- Preencher credenciais acima
- Eu implemento o código
- Deploy e teste

**Qual opção você prefere?**

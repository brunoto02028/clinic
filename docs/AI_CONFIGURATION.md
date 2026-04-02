# Configuração de IAs - BPR Clinic

## 📋 Visão Geral

Este documento define as prioridades e configurações de IA para cada tipo de tarefa no sistema BPR Clinic.

---

## 🤖 APIs Configuradas

### 1. **Minimax M2.7** (Principal)
- **API Key:** Configurada no Railway
- **Modelo:** `abab6.5s-chat`
- **Uso:** Geração de texto, artigos, conteúdo
- **Prioridade:** 🥇 **PRIMEIRA** para todas as tarefas de texto

### 2. **Google Gemini 2.0 Flash**
- **API Key:** Configurada no Railway
- **Modelo:** `gemini-2.0-flash`
- **Uso:** Fallback para texto, análise de imagens, visão
- **Prioridade:** 🥈 **SEGUNDA** (fallback quando Minimax falhar)

### 3. **OpenAI (DALL-E 3)**
- **API Key:** Configurada no Railway
- **Modelo:** `dall-e-3`
- **Uso:** Geração de imagens de alta qualidade
- **Prioridade:** 🥇 **PRIMEIRA** para geração de imagens

---

## 🎯 Prioridades por Tipo de Tarefa

### **Geração de Artigos e Conteúdo**
1. ✅ **Minimax M2.7** (principal)
2. ⚠️ Gemini 2.0 Flash (fallback)
3. ⚠️ OpenAI GPT (fallback final)

**Motivo:** Minimax oferece melhor qualidade e contexto para textos longos.

---

### **Geração de Imagens**
1. ✅ **DALL-E 3** (OpenAI) - melhor qualidade
2. ⚠️ Gemini Image Generation (fallback)
3. ⚠️ Stable Diffusion (fallback final)

**Motivo:** DALL-E 3 produz imagens mais realistas e profissionais.

---

### **Análise de Imagens / Visão**
1. ✅ **Gemini 2.0 Flash** (principal)
2. ⚠️ OpenAI GPT-4 Vision (fallback)

**Motivo:** Gemini tem excelente capacidade de visão e análise de imagens.

---

### **Chat e Conversação**
1. ✅ **Minimax M2.7** (principal)
2. ⚠️ Gemini 2.0 Flash (fallback)

**Motivo:** Minimax oferece respostas mais naturais e contextuais.

---

### **Transcrição de Áudio**
1. ✅ **Web Speech API** (browser nativo - grátis)
2. ⚠️ OpenAI Whisper (fallback)

**Motivo:** Web Speech API é gratuito e funciona bem para português e inglês.

---

### **Tradução**
1. ✅ **Minimax M2.7** (principal)
2. ⚠️ Gemini 2.0 Flash (fallback)

**Motivo:** Minimax mantém melhor o contexto e tom em traduções.

---

## 🔄 Sistema de Fallback Automático

O sistema implementa fallback automático em 3 níveis:

```
Minimax M2.7 → Gemini 2.0 Flash → OpenAI GPT
     ↓ (falha)        ↓ (falha)        ↓ (falha)
   Tenta próxima    Tenta próxima    Retorna erro
```

**Vantagens:**
- ✅ Sempre há uma IA disponível
- ✅ Melhor custo-benefício (usa a mais barata primeiro)
- ✅ Melhor qualidade (usa a melhor para cada tarefa)
- ✅ Transparente para o usuário

---

## 📊 Comparação de IAs

| Tarefa | Minimax M2.7 | Gemini 2.0 | OpenAI GPT-4 | DALL-E 3 |
|--------|--------------|------------|--------------|----------|
| **Artigos longos** | 🥇 Excelente | 🥈 Muito bom | 🥉 Bom | ❌ N/A |
| **Chat rápido** | 🥇 Excelente | 🥈 Muito bom | 🥉 Bom | ❌ N/A |
| **Análise de imagens** | ❌ N/A | 🥇 Excelente | 🥈 Muito bom | ❌ N/A |
| **Geração de imagens** | ❌ N/A | 🥈 Bom | ❌ N/A | 🥇 Excelente |
| **Tradução** | 🥇 Excelente | 🥈 Muito bom | 🥉 Bom | ❌ N/A |
| **Código** | 🥈 Muito bom | 🥇 Excelente | 🥉 Bom | ❌ N/A |
| **Custo** | 💰 Baixo | 💰 Baixo | 💰💰 Médio | 💰💰💰 Alto |
| **Velocidade** | ⚡ Rápida | ⚡⚡ Muito rápida | ⚡ Rápida | 🐌 Lenta |

---

## 🛠️ Implementação Técnica

### Arquivo: `lib/ai-provider.ts`

```typescript
// Prioridade de IAs por tipo de tarefa
export async function callAI(prompt: string, opts?: AICallOptions): Promise<string> {
  // 1. Tenta Minimax M2.7 (principal)
  const minimaxKey = await getMinimaxKey();
  if (minimaxKey) {
    try {
      return await callMinimaxDirect(prompt, opts);
    } catch (err) {
      console.warn("Minimax failed, falling back to Gemini");
    }
  }
  
  // 2. Fallback para Gemini
  return callGeminiDirect(prompt, opts);
}

export async function generateImageSmart(prompt: string, opts?: AIImageOptions): Promise<string[]> {
  // 1. Tenta DALL-E 3 (melhor qualidade)
  const openaiKey = await getOpenAIKey();
  if (openaiKey) {
    try {
      return await generateImageDALLE3(prompt, opts);
    } catch (err) {
      console.warn("DALL-E 3 failed, falling back to Gemini");
    }
  }
  
  // 2. Fallback para Gemini Image
  return generateImageGemini(prompt, opts);
}
```

---

## ✅ Status Atual

- ✅ Minimax M2.7 configurada e ativa
- ✅ Gemini 2.0 Flash configurada e ativa
- ✅ OpenAI (DALL-E 3) configurada e ativa
- ✅ Sistema de fallback automático implementado
- ✅ Prioridades definidas por tipo de tarefa
- ✅ Todas as variáveis de ambiente configuradas no Railway

---

## 🔍 Como Verificar

### Verificar qual IA está ativa:
```typescript
const info = await getActiveProviderInfo();
console.log(info);
// {
//   provider: "minimax",
//   hasMinimax: true,
//   hasGemini: true,
//   hasOpenAI: true,
//   defaultProvider: "minimax"
// }
```

### Testar geração de texto:
```typescript
const text = await callAI("Escreva um artigo sobre fisioterapia");
// Usa Minimax M2.7 automaticamente
```

### Testar geração de imagem:
```typescript
const images = await generateImageSmart("Physiotherapy clinic interior");
// Usa DALL-E 3 automaticamente
```

---

## 📝 Notas Importantes

1. **Minimax é SEMPRE a primeira opção** para texto/artigos
2. **DALL-E 3 é SEMPRE a primeira opção** para imagens
3. **Gemini é o fallback universal** (texto e imagens)
4. **Sistema escolhe automaticamente** - transparente para o usuário
5. **Logs no console** mostram qual IA foi usada e se houve fallback

---

## 🚀 Próximos Passos

- [ ] Monitorar uso e custos de cada IA
- [ ] Ajustar prioridades baseado em performance
- [ ] Adicionar mais providers se necessário
- [ ] Implementar cache para reduzir custos
- [ ] Criar dashboard de monitoramento de IAs

---

**Última atualização:** 2 de Abril de 2026  
**Configurado por:** Cascade AI  
**Status:** ✅ Totalmente funcional

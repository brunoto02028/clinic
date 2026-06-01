# 📘 Manual do Terapeuta - BPR Clinic

**Sistema de Geração de Palmilhas Personalizadas**

Este guia completo vai te ajudar a usar o sistema de forma eficiente e gerar palmilhas de alta qualidade.

---

## 🚀 Início Rápido

### **Fluxo Completo**
```
1. Upload Foot Scan
2. Análise AI
3. Revisão Clínica
4. Gerar Palmilhas (STL)
5. Validar Geometria
6. Aprovar para Produção
7. Notificar Paciente
```

---

## 📤 Upload de Foot Scan

### **Passo a Passo**

1. **Acesse Foot Scans**
   - Menu: Admin → Foot Scans
   - Clique em "Novo Scan"

2. **Selecione o Paciente**
   - Busque pelo nome
   - Ou crie novo paciente

3. **Upload de Imagens**
   - Pé esquerdo: Vista superior, lateral, posterior
   - Pé direito: Vista superior, lateral, posterior
   - Calçado: Foto do calçado atual

4. **Informações Adicionais**
   - Medidas do pé (se disponível)
   - Queixas principais
   - Observações clínicas

---

## 🤖 Análise AI

### **Como Funciona**

O sistema usa **Ensemble AI** (Groq + Minimax + Gemini) para:
- Detectar tipo de arco
- Analisar pronação
- Medir alinhamento do calcâneo
- Detectar hallux valgus
- Calcular ângulos biomecânicos

### **Executar Análise**

1. **Abra o Foot Scan**
2. **Clique em "Analisar"**
3. **Aguarde Processamento** (30-60s)
4. **Revise Resultados**

### **Resultados da Análise**

A análise fornece:
- ✅ Tipo de arco (Normal, Flat, High)
- ✅ Pronação (Neutral, Over, Under)
- ✅ Alinhamento do calcâneo (graus)
- ✅ Ângulo hallux valgus
- ✅ Recomendações automáticas

---

## 🔍 Revisão Clínica

### **O Que Revisar**

1. **Precisão da Análise**
   - Tipo de arco está correto?
   - Pronação foi bem detectada?
   - Ângulos fazem sentido?

2. **Recomendações**
   - Altura do arco apropriada?
   - Posting necessário?
   - Metatarsal pad indicado?

3. **Ajustes Necessários**
   - Modificar especificações
   - Adicionar notas clínicas
   - Ajustar correções

### **Aprovar ou Solicitar Mudanças**

- ✅ **Aprovar**: Se tudo correto
- 🔄 **Solicitar Mudanças**: Se precisa ajustes
- ❌ **Rejeitar**: Se análise incorreta

---

## 👟 Gerar Palmilhas (STL)

### **Processo de Geração**

1. **Clique em "Gerar Palmilhas"**
2. **Sistema Calcula Especificações**
   - Altura do arco
   - Ângulo de posting
   - Profundidade heel cup
   - Metatarsal pad (se necessário)
   - Zonas de offloading

3. **Geração de Malha 3D**
   - Cria geometria base
   - Aplica correções
   - Valida geometria

4. **Exportação STL**
   - Gera arquivo binário
   - Salva em servidor
   - Cria URLs acessíveis

### **Tempo de Geração**
- Pé esquerdo: ~15-20s
- Pé direito: ~15-20s
- **Total: ~30-40s**

---

## ✅ Validação de Geometria

### **O Sistema Valida Automaticamente**

1. **Tamanho**
   - Comprimento: 150-350mm ✓
   - Largura: 50-200mm ✓
   - Espessura: >1mm ✓

2. **Qualidade da Malha**
   - Manifold (watertight) ✓
   - Normais consistentes ✓
   - Sem valores inválidos ✓

3. **Volume**
   - Volume mínimo: >1000mm³ ✓

### **Se Validação Falhar**

O sistema mostra:
- ❌ Erros críticos (bloqueiam produção)
- ⚠️ Avisos (podem prosseguir)

**Ação:**
- Revisar especificações
- Ajustar parâmetros
- Gerar novamente

---

## 📋 Especificações Técnicas

### **Componentes da Palmilha**

#### **1. Suporte de Arco**
- **Altura**: 0-15mm
- **Posição**: ~45% do comprimento
- **Largura**: 20-50mm
- **Inclinação**: 5-20°

**Quando Usar:**
- Pé plano: 10-12mm
- Pé normal: 6-8mm
- Pé cavo: 4-6mm

#### **2. Posting (Cunhas)**
- **Tipo**: Medial, Lateral, None
- **Ângulo**: 0-8°
- **Extensão**: ~60mm do calcanhar

**Quando Usar:**
- Overpronation: Medial posting
- Supination: Lateral posting
- Neutral: Sem posting

#### **3. Heel Cup**
- **Profundidade**: 10-20mm
- **Largura**: 50-80mm
- **Ângulo**: 8-15°

**Sempre incluir** para estabilidade

#### **4. Metatarsal Pad**
- **Altura**: 2-5mm
- **Diâmetro**: 20-35mm
- **Posição**: ~65% do comprimento

**Quando Usar:**
- Hallux valgus >15°
- Metatarsalgia
- Dor no antepé

#### **5. Offloading Zones**
- **Profundidade**: 1-3mm
- **Raio**: 10-20mm

**Quando Usar:**
- Hallux valgus severo
- Calosidades
- Pontos de pressão

---

## 🏭 Aprovar para Produção

### **Checklist Antes de Aprovar**

- [ ] Análise revisada e aprovada
- [ ] STL gerados com sucesso
- [ ] Geometria validada
- [ ] Especificações corretas
- [ ] Paciente notificado

### **Aprovar**

1. **Clique em "Aprovar para Produção"**
2. **Sistema Atualiza Status**
   - Workflow: APPROVED_FOR_PRODUCTION
   - Manufacturing: READY

3. **Paciente Recebe Notificação**
   - E-mail: "Em Produção"
   - In-app: Notificação
   - Timeline atualizada

---

## 📊 Acompanhamento

### **Status do Workflow**

```
CASE_CREATED
  ↓
CAPTURE_SUBMITTED
  ↓
MEASUREMENT_READY
  ↓
CLINICAL_REVIEW_PENDING ← Você revisa aqui
  ↓
APPROVED_FOR_PRODUCTION ← Após gerar palmilhas
  ↓
IN_PRODUCTION
  ↓
SHIPPED
  ↓
DELIVERED
```

### **Atualizar Status**

1. **Em Produção**
   - Quando enviar para fabricação

2. **Pronto para Retirar**
   - Quando palmilhas estiverem prontas
   - Paciente recebe SMS + E-mail

3. **Entregue**
   - Quando paciente retirar

---

## 📝 Relatórios

### **Gerar Relatório Técnico**

1. **Abra o Foot Scan**
2. **Clique em "Gerar Relatório"**
3. **PDF Inclui:**
   - Dados do paciente
   - Análise biomecânica
   - Especificações técnicas
   - Desenhos 2D
   - Instruções de manufatura

### **Compartilhar com Laboratório**

- Download PDF
- Enviar por e-mail
- Incluir arquivos STL

---

## 🔧 Troubleshooting

### **Problema: Análise AI Falhou**

**Causas:**
- Imagens de baixa qualidade
- Falta de imagens
- Erro de API

**Solução:**
1. Verificar qualidade das imagens
2. Re-upload se necessário
3. Tentar novamente
4. Contatar suporte se persistir

### **Problema: Geração de STL Falhou**

**Causas:**
- Especificações inválidas
- Erro de geometria
- Timeout

**Solução:**
1. Revisar especificações
2. Ajustar parâmetros extremos
3. Tentar novamente
4. Verificar logs

### **Problema: Validação Falhou**

**Causas:**
- Geometria muito pequena/grande
- Espessura insuficiente
- Malha não-manifold

**Solução:**
1. Revisar mensagens de erro
2. Ajustar especificações
3. Gerar novamente

---

## 💡 Dicas e Boas Práticas

### **Para Melhores Resultados**

1. **Imagens de Qualidade**
   - Boa iluminação
   - Fundo neutro
   - Pé centralizado
   - Múltiplos ângulos

2. **Revisão Cuidadosa**
   - Sempre revisar análise AI
   - Comparar com avaliação clínica
   - Ajustar quando necessário

3. **Comunicação com Paciente**
   - Explicar o processo
   - Gerenciar expectativas
   - Acompanhar adaptação

4. **Documentação**
   - Registrar observações
   - Manter histórico
   - Facilitar follow-up

### **Casos Especiais**

#### **Pé Diabético**
- Offloading zones críticas
- Espessura extra
- Material mais macio
- Monitoramento frequente

#### **Atletas**
- Suporte de arco firme
- Material mais rígido
- Foco em performance
- Durabilidade aumentada

#### **Idosos**
- Conforto prioritário
- Material mais macio
- Heel cup profundo
- Estabilidade extra

---

## 📈 Métricas e KPIs

### **Acompanhe**

- ⏱️ Tempo médio de análise
- ✅ Taxa de aprovação primeira vez
- 🔄 Taxa de retrabalho
- 😊 Satisfação do paciente
- 📊 Volume de produção

### **Metas**

- Análise: <2 min
- Aprovação: >90%
- Retrabalho: <5%
- Satisfação: >95%

---

## 🆘 Suporte Técnico

### **Problemas Técnicos**

**E-mail:** tech@bpr.rehab  
**Telefone:** (01473) XXX-XXX  
**Horário:** Segunda a Sexta, 9h-18h

### **Dúvidas Clínicas**

**E-mail:** clinical@bpr.rehab  
**WhatsApp:** +44 XXXX XXXXXX

---

## 📚 Recursos Adicionais

### **Documentação**
- Manual do Paciente
- Guia de Deploy
- API Reference
- Troubleshooting Guide

### **Treinamento**
- Vídeos tutoriais
- Webinars mensais
- Sessões 1-on-1

---

**BPR Clinic - Tecnologia a serviço da saúde** 🚀

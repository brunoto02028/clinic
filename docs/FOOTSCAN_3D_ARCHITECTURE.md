# FootScan 3D + Pisada - Arquitetura de Integração

## Visão Geral

Integração de apps LiDAR (Xesto Fit, Polycam) para scan 3D dos pés + captura da pisada (plantar contact area).

---

## Fluxo Completo do Paciente

```
1. Recebe link /scan/{token}
2. Escolhe modo: "Fotos 2D" ou "Scan 3D LiDAR"
3. Se 3D:
   a. Baixa Xesto Fit (link App Store)
   b. Segue tutorial in-app para scan do pé
   c. Exporta arquivo .obj/.stl
   d. Faz upload no seu sistema
4. Captura pisada:
   a. "Ink method": pinta planta, pisa no A4, fotografa
   b. Ou: usa podoscópio (se disponível na clínica)
5. Sistema processa: 3D + pisada → medições → relatório
```

---

## Modelo de Dados (Atualizações)

```prisma
model FootScan {
  // ... campos existentes ...
  
  // Novos campos para 3D
  model3DUrl         String?    // S3 URL do modelo 3D (.obj/.stl)
  model3DPath        String?    // cloud_storage_path
  model3DFormat      String?    // 'obj', 'stl', 'usdz'
  model3DSource      String?    // 'xesto_fit', 'polycam', 'manual'
  
  // Pisada (Plantar)
  footprintImageUrl  String?    // Foto da pisada (ink method)
  footprintImagePath   String?
  footprintMethod      String?    // 'ink_a4', 'podoscope', '3d_estimate'
  
  // Dados extraídos da pisada
  contactAreaCm2     Float?     // Área de contato em cm²
  archIndex          Float?     // Índice de arco (0-1)
  pressurePoints     Json?      // Pontos de pressão detectados
  
  // Status unificado
  captureMethod      String     @default("2d_photos") // '2d_photos' | '3d_lidar'
}
```

---

## Endpoints API

### 1. Upload de Modelo 3D

```http
POST /api/foot-scans/{id}/upload-3d
Content-Type: multipart/form-data

Body:
- file: <arquivo .obj/.stl>
- format: "obj" | "stl" | "usdz"
- source: "xesto_fit" | "polycam"
```

### 2. Upload de Pisada

```http
POST /api/foot-scans/{id}/upload-footprint
Content-Type: multipart/form-data

Body:
- file: <imagem da pisada>
- method: "ink_a4" | "podoscope"
```

### 3. Processamento (Background Job)

```http
POST /api/foot-scans/{id}/process-3d

Actions:
1. Extrai métricas do modelo 3D (comprimento, largura, volume)
2. Processa imagem da pisada (OpenCV)
   - Detecta A4 para calibração
   - Extrai silhueta da pisada
   - Calcula arch index
3. Combina dados 3D + pisada
4. Gera recomendações de palmilha
```

---

## Componentes Frontend

### 1. Seleção de Método

```tsx
// app/scan/[token]/page.tsx - novo step

<ScanMethodSelector
  onSelect={(method) => {
    if (method === "3d_lidar") setStep("xesto_instructions");
    else setStep("mode_select"); // fluxo 2D atual
  }}
/>
```

### 2. Tutorial Xesto Fit

```tsx
<XestoFitGuide
  steps={[
    { title: "Baixe o Xesto Fit", content: "Link App Store" },
    { title: "Scan Left Foot", video: "/tutorials/scan-left.mp4" },
    { title: "Scan Right Foot", video: "/tutorials/scan-right.mp4" },
    { title: "Exporte o arquivo", content: "Export → .obj" },
    { title: "Faça upload aqui", component: <FileUpload3D /> }
  ]}
/>
```

### 3. Captura da Pisada (Ink Method)

```tsx
<FootprintCapture
  method="ink_a4"
  onCapture={async (file) => {
    await uploadFootprint(scanId, file);
  }}
/>
```

---

## Processamento de Pisada (Python/OpenCV)

```python
# lib/process_footprint.py

import cv2
import numpy as np

class FootprintProcessor:
    A4_WIDTH_MM = 210
    A4_HEIGHT_MM = 297
    
    def process(self, image_path: str) -> dict:
        """
        Processa imagem da pisada em A4.
        Retorna: área de contato, arch index, pontos de pressão
        """
        img = cv2.imread(image_path)
        
        # 1. Detecta A4 para calibração
        a4_rect = self._detect_a4(img)
        pixels_per_mm = self._calculate_scale(a4_rect)
        
        # 2. Extrai silhueta da pisada (área escura)
        footprint_mask = self._extract_footprint(img)
        
        # 3. Calcula métricas
        contact_area = np.sum(footprint_mask > 0) / (pixels_per_mm ** 2)
        arch_index = self._calculate_arch_index(footprint_mask)
        
        # 4. Detecta pontos de pressão (áreas mais escuras = mais pressão)
        pressure_points = self._detect_pressure_points(
            img, footprint_mask
        )
        
        return {
            "contactAreaCm2": contact_area / 100,
            "archIndex": arch_index,
            "pressurePoints": pressure_points,
            "hasA4Calibration": True
        }
    
    def _extract_footprint(self, img):
        """Extrai silhueta do pé da imagem"""
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        # Threshold para área escura (tinta)
        _, mask = cv2.threshold(gray, 80, 255, cv2.THRESH_BINARY_INV)
        # Remove ruído
        kernel = np.ones((5,5), np.uint8)
        mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
        return mask
```

---

## Checklist de Implementação

### Fase 1: Infraestrutura (2-3 dias)
- [ ] Migration Prisma (novos campos)
- [ ] Endpoint upload-3d
- [ ] Endpoint upload-footprint
- [ ] S3 bucket config (separar modelos 3D)

### Fase 2: Frontend (3-4 dias)
- [ ] UI seleção de método (2D vs 3D)
- [ ] Tutorial Xesto Fit
- [ ] Componente upload arquivo 3D
- [ ] UI captura pisada (ink method)

### Fase 3: Processamento (4-5 dias)
- [ ] Parser de arquivos .obj/.stl
- [ ] Extrator de métricas 3D
- [ ] Processador de pisada (OpenCV)
- [ ] Combinação 3D + pisada

### Fase 4: Integração (2 dias)
- [ ] Atualiza relatórios com dados 3D
- [ ] Export STL para manufatura
- [ ] Testes end-to-end

---

## Custo Comparativo

| Método | Precisão | Custo Paciente | Custo Clínica | Tempo |
|--------|----------|----------------|---------------|-------|
| Fotos 2D (atual) | ~5mm | £0 | £0 | 10 min |
| 3D LiDAR + Ink | ~2mm | £0 (app free) | £0 | 15 min |
| 3D + Podoscópio | ~1.5mm | £0 | £40 (DIY) | 12 min |
| Scanner Profissional | ~0.5mm | £0 | £2k-5k | 5 min |

---

## Recomendação

**Implementar: 3D LiDAR + Ink Method**

- Melhor custo-benefício
- Não requer hardware adicional
- Precisão suficiente para 95% dos casos
- Experiência do paciente melhorada

**Próximos passos:**
1. Aprovar arquitetura
2. Criar migration
3. Desenvolver prototipo do processador de pisada

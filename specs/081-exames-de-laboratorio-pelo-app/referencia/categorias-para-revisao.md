# As categorias do catálogo de exames — lista para revisão

**Gerada por `scripts/report-lab-categories.js`** (081, T-14), a pedido do
Bruno: *"de acordo com as categorias que nós mesmos estamos montando"*.

Isto é para ser **lido e corrigido**. Uma categoria errada não é informação
falsa sobre saúde — é um exame difícil de achar. Mas são centenas, e a única
forma de saber se a regra acertou é alguém que conhece os exames passar o olho.

A regra é ordenada e a primeira que casa vence; **o nome do exame pesa mais que
a composição dele** — foi a correção que pôs o `Anaemia Profile` em sangue em vez
de rim, e o `Heart Health Profile` em coração em vez de diabetes. Quem discordar
de uma linha: a correção é um padrão em `scripts/lab-categories.js`, não uma
edição no banco. Depois, recarregar e gerar esta lista de novo.

| categoria | exames | nome na tela (EN / PT) |
|---|---|---|
| `immunity` | 65 | Immunity & autoimmunity / Imunidade e autoimunidade |
| `infection` | 53 | Infections / Infecções |
| `hormones` | 42 | Hormones / Hormônios |
| `nutrition` | 33 | Vitamins & nutrition / Vitaminas e nutrição |
| `toxicology` | 24 | Toxins & metals / Toxinas e metais |
| `swabs` | 19 | Swabs & samples / Amostras e swabs |
| `cardiovascular` | 18 | Heart & cholesterol / Coração e colesterol |
| `tumour_markers` | 17 | Tumour markers / Marcadores tumorais |
| `thyroid` | 16 | Thyroid / Tireoide |
| `allergy` | 15 | Allergy / Alergia |
| `general` | 15 | General health / Saúde geral |
| `haematology` | 15 | Blood / Sangue |
| `kidney` | 15 | Kidneys / Rins |
| `sexual_health` | 15 | Sexual health / Saúde sexual |
| `coagulation` | 13 | Blood clotting / Coagulação |
| `diabetes` | 11 | Diabetes & blood sugar / Diabetes e glicemia |
| `liver` | 11 | Liver / Fígado |
| `drug_monitoring` | 10 | Medication monitoring / Monitoramento de medicamento |
| `digestive` | 7 | Digestion / Digestão |
| `fertility` | 6 | Fertility & pregnancy / Fertilidade e gravidez |
| `metabolic` | 6 | Metabolic / Metabólico |
| `genetics` | 5 | Genetics / Genética |
| `iron` | 5 | Iron / Ferro |
| `bone` | 4 | Bone & minerals / Ossos e minerais |
| `inflammation` | 3 | Inflammation / Inflamação |

**Total: 443**, nenhum sem categoria.

Os de código `X…` são os kits de consumo que já estavam no catálogo (picada no
dedo, em casa); os restantes vieram da planilha de parceiro de 2026. **À venda**
marca os que o paciente vê hoje.

---

## Immunity & autoimmunity — Imunidade e autoimunidade

`immunity` · 65 exames

| | código | exame | marcadores | prazo | venda |
|---|---|---|---|---|---|
|  | `ARA` | Acetylcholine Receptor Autoantibodies | 1 | 6 d | £265 |
|  | `ACT` | Adrenal Cortex Antibodies | 1 | 2 d | £85 |
|  | `AFA` | Amoebic (E. histolytica) Antibodies | 1 | 5 d | £96 |
|  | `ANC` | ANCA (Anti-Neutrophil Cytoplasmic Antibodies) | 1 | 3 d | £108 |
|  | `ACE` | Angiotensin Converting Enzyme | 1 | 1 d | £99 |
|  | `CCP` | Anti-CCP Antibodies (RF) | 1 | 1 d | £88 |
|  | `ADA` | ANTI-DSDNA | 1 | 3 d | £88 |
|  | `AMO` | Anti-MOG (Myelin Oligodendrocyte Glycoprotein) Antibodies | 1 | 21 d | £195 |
|  | `ANA` | Antinuclear Antibodies (Titre & Pattern) | 1 | 5 d | £88 |
|  | `TGA` | Antithyroglobulin Antibodies | 1 | 1 d | £49 |
|  | `AQP` | Aquaporin 4 Antibodies (Neuromyelitis Optica) | 1 | 14 d | £278 |
|  | `ARB` | Arbovirus Antibodies | 1 | 14 d | £372 |
|  | `AUT` | Autoantibody Profile 1 | 4 | 5 d | £221 |
|  | `BBA` | Babesia Antibodies | 1 | 21 d | £210 |
|  | `C1E` | C1 Esterase Inhibitor | 1 | 7 d | £169 |
|  | `IMC` | C1q Binding Immune Complex | 1 | 7 d | £169 |
|  | `C3` | C3 Complement | 1 | 1 d | £99 |
|  | `C4` | C4 Complement | 1 | 1 d | £99 |
|  | `CDA` | Cardiolipin Antibodies (IgG+IgM) | 2 | 3 d | £159 |
|  | `C56` | CD56 | 1 | 1 d | £171 |
|  | `CHI` | Chikungunya Virus Antibodies | 1 | 14 d | £529 |
|  | `GS1` | Coeliac/Gluten Sensitivity Profile | 3 | 3 d | £124 |
|  | `C1Q` | Complement C1q | 1 | 7 d | £185 |
|  | `C2` | Complement C2 | 1 | 5 d | £249 |
|  | `XCG` | Covid IgG Antibodies | 1 | 1 d | £89 |
|  | `DPH` | Diphtheria Antibodies | 1 | 7 d | £129 |
|  | `HAB` | Echinococcus (Hydatid) Antibodies | 1 | 5 d | £129 |
|  | `ENA` | Extractable Nuclear Antibodies (nRNP, Sm, Ro, La, Jo1, Scl70) CENP-B | 7 | 5 d | £119 |
|  | `GAS` | Gastric Parietal Autoantibodies | 1 | 7 d | £101.5 |
|  | `GBM` | Glomerular Basement Membrane Antibodies | 1 | 2 d | £125 |
|  | `GAD` | Glutamic Acid Decarboxylase Antibodies (GAD 65) | 1 | 7 d | £259 |
|  | `HPA` | H. pylori Antibodies (IgG) | 1 | 1 d | £105 |
|  | `HIA` | Haemophilus B Influenzae Antibodies | 1 | 7 d | £149 |
|  | `HTV` | HTLV 1& 2 Abs. (Human T Lymphotropic Virus Type I-II) | 1 | 2 d | £129 |
|  | `IGS` | IgG Subclasses | 1 | 5 d | £389 |
|  | `IGA` | Immunoglobulin A | 1 | 1 d | £65 |
|  | `IGE` | Immunoglobulin E – Total | 1 | 1 d | £65 |
|  | `IGG` | Immunoglobulin G | 1 | 1 d | £65 |
|  | `IGM` | Immunoglobulin M | 1 | 1 d | £65 |
|  | `IMM` | Immunoglobulins (IgG, IgM, IgA) | 3 | 1 d | £149 |
|  | `IFA` | Intrinsic Factor Antibodies | 1 | 7 d | £99 |
|  | `ICB` | Islet Cell Antibodies | 1 | 3 d | £179 |
|  | `LEA` | Leishmania Antibodies | 1 | 7 d | £215 |
|  | `LYS` | Lymphocyte Subsets (CD3/CD4/CD8) | 10 | 2 d | £349 |
|  | `MEN` | Meningococcal Antibodies | 1 | 35 d | £169 |
|  | `MTA` | Mitochondrial Antibodies | 1 | 3 d | £89 |
|  | `MPO` | Myeloperoxidase Antibodies | 1 | 1 d | £137 |
|  | `MSO` | Myositis Panel | 1 | 7 d | £229 |
|  | `4RF` | NK Assay/Cytotoxicity Panel | 1 | 7 d | £679 |
|  | `OVA` | Ovarian Autoantibodies | 1 | 2 d | £179 |
|  | `PGM` | Parvovirus IgG/IgM Antibodies | 2 | 3 d | £227 |
|  | `PR3` | Proteinase 3 Antibodies | 1 | 5 d | £115 |
|  | `PUR` | Purkinje Cell Antibody (Hu and Yo) | 1 | 14 d | £139 |
|  | `QFA` | Q Fever (C Burnetti) Antibodies | 1 | 4 d | £170 |
|  | `RAB` | Rabies Antibody | 1 | 14 d | £377.5 |
|  | `RF` | Rheumatoid Factor (Latex Test) | 1 | 1 d | £59 |
|  | `RIC` | Rickettsial Species Antibody Profile | 1 | 8 d | £273.41 |
|  | `ASM` | Smooth Muscle Antibodies | 1 | 5 d | £89 |
|  | `STG` | Strongyloides Antibodies | 1 | 10 d | £165 |
|  | `TEA` | Tetanus Antibody | 1 | 5 d | £139 |
|  | `TAA` | Tissue Transglutaminase IgA (Coeliac) | 2 | 1 d | £146.2 |
|  | `WCA` | Whooping Cough (Pertussis) Antibodies | 1 | 6 d | £273 |
|  | `YFA` | Yellow Fever Antibodies | 1 | 14 d | £323 |
|  | `YEA` | Yersinia Antibodies | 1 | 6 d | £197 |
|  | `ZKA` | Zika Abs IgM and IgG - Antibody detection from 15 days | 2 | 1 d | £259 |

---

## Infections — Infecções

`infection` · 53 exames

| | código | exame | marcadores | prazo | venda |
|---|---|---|---|---|---|
|  | `ADV` | Adenovirus by PCR | 1 | — | £463 |
|  | `ASL` | Antistreptolysin Titre (ASOT) | 1 | 3 d | £115 |
|  | `AAS` | Ascariasis Serology | 1 | 6 d | £151 |
|  | `BDG` | Beta D Glucan | 1 | 14 d | £332 |
|  | `BLH` | Bilharzia (Schistosome) Antibody Screen | 1 | 1 d | £205 |
|  | `SHU` | Bilharzia/Schistosoma (Urine) | 1 | 1 d | £119 |
|  | `BKP` | BK Polyoma Virus by PCR | 1 | 7 d | £306 |
|  | `CNG` | Candida (Culture-Groin) | 1 | 1 d | £138 |
|  | `CNC` | Candida (Culture) | 1 | 1 d | £138 |
|  | `CAN` | Candida Antibodies | 3 | 7 d | £307.09 |
|  | `CHG` | Chagas Disease Serology (S.American Trypanosomiasis) T. Cruzi | 1 | — | £225 |
|  | `CLS` | Clostridium Difficile Toxin by PCR | 1 | 3 d | £199 |
|  | `DNS` | Dengue Virus Serology | 3 | 6 d | £179 |
|  | `EBA` | Epstein-Barr Virus Antibodies IgG/IgM | 3 | 1 d | £179 |
|  | `EBV` | Epstein-Barr Virus PCR | 1 | 7 d | £349 |
|  | `GPCR` | Gastrointestinal Panel | 21 | 1 d | £240.8 |
|  | `HBM` | Hep B Core IgM | 1 | 1 d | £74 |
|  | `HAV` | Hepatitis A (IgM) | 1 | 1 d | £67 |
|  | `HAI` | Hepatitis A Immunity (IgG/IgM) | 2 | 1 d | £99 |
|  | `ABC` | Hepatitis A, B & C Profile | 12 | 1 d | £195 |
|  | `HBC` | Hepatitis B Core Antibody – Total | 1 | 1 d | £89 |
|  | `HPE` | Hepatitis B e Antigen and Antibody | 2 | 1 d | £229 |
|  | `HBI` | Hepatitis B Immunity (Quantitative) | 1 | 1 d | £49 |
|  | `HBP` | Hepatitis B Profile | 3 | 1 d | £129 |
|  | `HBG` | Hepatitis B Surface Antigen | 1 | 1 d | £49 |
|  | `HCA` | Hepatitis C Antibodies | 1 | 1 d | £69 |
|  | `QCL` | Hepatitis C Quantification (Viral Load) | 1 | 1 d | £349 |
|  | `HDA` | Hepatitis Delta Antibody | 1 | 6 d | £219 |
|  | `HE` | Hepatitis E IgG/IgM Antibodies | 1 | 6 d | £186 |
|  | `H8G` | Human Herpes Virus – 8 (IgG) | 1 | 10 d | £199 |
|  | `LEG` | Legionella Antibodies | 1 | 3 d | £169 |
|  | `LUA` | Legionella Urine Antigen | 1 | 2 d | £205 |
|  | `LEM` | Leptospirosis (Weil's Disease) Antibodies (IgM) | 1 | 7 d | £129 |
|  | `BRA` | Lyme Disease (Borrelia Antibodies) IgG/IgM | 2 | 1 d | £199 |
|  | `MAL` | Malarial Antibodies (Pl. falciparum) | 1 | 3 d | £149 |
|  | `MAP` | Malarial Parasites | 1 | 1 d | £81 |
|  | `MEA` | Measles Antibodies (IgG) Immunity | 1 | 1 d | £65 |
|  | `MR3` | MRSA Rapid PCR (Groin) | 1 | 1 d | £125 |
|  | `MR2` | MRSA Rapid PCR (Nasal) | 1 | 1 d | £125 |
|  | `MUM` | Mumps Antibodies (IgG) Immunity | 1 | 1 d | £69 |
|  | `MAM` | Mumps Antibodies (IgM) current or recent infection | 1 | 2 d | £139 |
|  | `PBM` | Paul Bunnell (Monospot) | 1 | 1 d | £65 |
|  | `PNS` | Pneumonia (Atypical) Screen | 1 | 7 d | £273.41 |
|  | `ROT` | Rotavirus in Stool by PCR | 1 | 2 d | £169 |
|  | `RBG` | Rubella Antibody (IgG) Immunity | 1 | 1 d | £59 |
|  | `RBM` | Rubella Antibody (IgM) | 1 | 1 d | £182.75 |
|  | `OCP` | Stool Ova, Cysts and Parasites | 2 | 1 d | £102 |
|  | `TBQ` | TB Quantiferon-TB Gold | 1 | 3 d | £165 |
|  | `TOM` | Toxoplasma antibodies (IgG & IgM) | 2 | 1 d | £175 |
|  | `UCE` | Urine Microscopy & Culture | 7 | 2 d | £69 |
|  | `VZG` | Varicella Zoster IgG Antibodies (immunity) | 1 | 1 d | £84 |
|  | `VZM` | Varicella Zoster IgM Abs | 1 | 2 d | £99 |
|  | `VPR` | Viral Respiratory Screen | 11 | 1 d | £423.33 |

---

## Hormones — Hormônios

`hormones` · 42 exames

| | código | exame | marcadores | prazo | venda |
|---|---|---|---|---|---|
|  | `ACH` | ACTH (Adreno Corticotrophic Hormone) | 1 | 2 d | £229 |
|  | `ADI` | Adiponectin | 1 | 14 d | £412 |
|  | `ALN` | Aldosterone | 1 | 6 d | £178 |
|  | `CAU` | Catecholamines (Urine) | 1 | 6 d | £348 |
|  | `COR` | Cortisol | 1 | 1 d | £125 |
|  | `DHE` | DHEA Sulphate | 1 | 1 d | £59 |
|  | `DHT` | Dihydrotestosterone | 1 | 10 d | £219 |
|  | `IMP` | Erectile Dysfunction Impotence Profile | 15 | 1 d | £115 |
|  | `XIM` | Erectile Dysfunction Profile | 6 | 1 d | £169 |
|  | `ERY` | Erythropoietin | 1 | 1 d | £169 |
|  | `XFI` | Fertility Hormones | 4 | 1 d | £129 |
|  | `FIP` | Fertility Hormones Profile | 5 | 1 d | £89 |
|  | `FAI` | Free Androgen Index (calculated) | 3 | 1 d | £69 |
|  | `UCO` | Free Cortisol (Urine) | 1 | 1 d | £135 |
|  | `GH` | Growth Hormone (Fasting) | 1 | 1 d | £108 |
|  | `FHL` | Hair Loss Profile Female - Bespoke | 31 | 1 d | £149 |
|  | `HRT` | HRT Profile 1 | 3 | 1 d | £99 |
|  | `SOM` | IGF-1 (Somatomedin) | 1 | 1 d | £169 |
|  | `LEP` | Leptin | 1 | 14 d | £199 |
|  | `LH` | Luteinising Hormone | 1 | 1 d | £59 |
|  | `MHLP` | Male Hair Loss Profile | 38 | 1 d | £179 |
|  | `MHP` | Male Hormone Profile | 10 | 1 d | £99 |
|  | `XMH` | Male Hormones | 9 | 1 d | £169 |
|  | `XFM` | Menopause | 4 | 1 d | £129 |
|  | `FMP` | Menopause Hormones Profile | 5 | 1 d | £79 |
|  | `OES` | Oestradiol (E2) | 1 | 1 d | £49 |
|  | `E1` | Oestrone | 1 | 5 d | £189 |
|  | `PRN` | Pregnenolone | 1 | 15 d | £219 |
|  | `PROG` | Progesterone | 1 | 1 d | £39 |
|  | `XPR` | Progesterone — Day 21 | 1 | 1 d | £59 |
|  | `PRL` | Prolactin | 1 | 1 d | £39 |
|  | `SHB` | Sex Hormone Binding Globulin | 1 | 1 d | £39 |
|  | `MLSH` | Sports Hormone Profile | 19 | 1 d | £189 |
|  | `SYT` | Synacthen Stimulation Test | 1 | 1 d | £299 |
|  | `FTE` | Testosterone - Free (Serum) | 1 | 1 d | £139 |
|  | `XTE` | Testosterone Check | 1 | 1 d | £59 |
|  | `TEST` | Testosterone Check | 1 | 1 d | £39 |
|  | `XTP` | Testosterone Plus | 4 | 1 d | £69 |
|  | `TESTP` | Testosterone Plus Profile | 4 | 1 d | £59 |
|  | `TER` | Testosterone Replacement Therapy Profile | 37 | 1 d | £149 |
|  | `VHP` | Verve Aesthetics - Hair Loss Profile | 23 | 1 d | £179 |
|  | `VMA` | VMA Excretion | 1 | 6 d | £270 |

---

## Vitamins & nutrition — Vitaminas e nutrição

`nutrition` · 33 exames

| | código | exame | marcadores | prazo | venda |
|---|---|---|---|---|---|
|  | `CAR` | Carotenes (Beta Carotene) | 1 | 2 d | £159 |
|  | `CQ` | Coenzyme Q10 | 1 | 1 d | £259 |
|  | `CU` | Copper (Serum) | 1 | 1 d | £129 |
|  | `RCF` | Folate (Red Cell) | 1 | 1 d | £68 |
|  | `FOL` | Folate (Vitamin B9) | 1 | 1 d | £39 |
|  | `SIO` | Iodine – Serum | 1 | 7 d | £299 |
|  | `MG` | Magnesium (Serum) | 1 | 1 d | £49 |
|  | `MGB` | Magnesium (Whole blood) | 1 | 1 d | £119 |
|  | `MTS` | Methylmalonic acid (serum) | 1 | 7 d | £289 |
|  | `MMA` | Methylmalonic acid (urine) | 1 | 7 d | £219 |
|  | `O36` | Omega 3/Omega 6 | 4 | 7 d | £169 |
|  | `SEB` | Selenium (Red Cell) | 1 | 1 d | £69 |
|  | `SEL` | Selenium (Serum) | 1 | 1 d | £129 |
|  | `VTA` | VITAMIN A (RETINOL) | 1 | 2 d | £132 |
|  | `VT1` | VITAMIN B1 (THIAMINE) | 1 | 2 d | £132 |
|  | `B12` | Vitamin B12 | 1 | 1 d | £39 |
|  | `XB2` | Vitamin B12 | 1 | 1 d | £59 |
|  | `V12` | VITAMIN B12 (ACTIVE) | 1 | 1 d | £79 |
|  | `VB2` | VITAMIN B2 (RIBOFLAVIN) | 1 | 2 d | £99 |
|  | `VB3` | VITAMIN B3 (NICOTINAMIDE) | 1 | 7 d | £122 |
|  | `VB5` | Vitamin B5 (Pantothenic Acid) | 1 | 14 d | £169 |
|  | `VB6` | VITAMIN B6 (PYRIDOXINE) | 1 | 2 d | £145 |
|  | `BIO` | Vitamin B7 (Biotin) | 1 | 3 d | £150 |
|  | `VTC` | Vitamin C | 1 | 2 d | £157.5 |
| **à venda** | `XVD` | Vitamin D | 1 | 1 d | £69 |
|  | `VTD` | Vitamin D | 1 | 1 d | £49 |
|  | `VTE` | Vitamin E (alpha Tocopherol) | 1 | 2 d | £149 |
|  | `VKN` | VITAMIN K (NUTRITIONAL) | 1 | 14 d | £191.89 |
|  | `VP` | Vitamin Profile | 3 | 1 d | £89 |
| **à venda** | `XVP` | Vitamin Profile | 3 | 1 d | £129 |
|  | `VP1` | Vitamin Profile 1 | 6 | 2 d | £536.07 |
|  | `ZN` | Zinc (Serum) | 1 | 1 d | £119 |
|  | `ZNB` | Zinc (Whole Blood) | 1 | 2 d | £79 |

---

## Toxins & metals — Toxinas e metais

`toxicology` · 24 exames

| | código | exame | marcadores | prazo | venda |
|---|---|---|---|---|---|
|  | `ALM` | Alcohol (Medical) | 1 | 4 d | £79 |
|  | `AL` | Aluminium (Blood) | 1 | 14 d | £156 |
|  | `AUU` | Aluminium (Urine) | 1 | 14 d | £332 |
|  | `ARS` | Arsenic (Blood) | 1 | 2 d | £205 |
|  | `ARU` | Arsenic (Urine) | 1 | 1 d | £205 |
|  | `BNZ` | Benzene | 1 | 4 d | £257.1 |
|  | `CD` | Cadmium (Blood) | 1 | 7 d | £109 |
|  | `CBH` | Carboxyhaemoglobin | 1 | 7 d | £259 |
|  | `CR` | Chromium (Blood) | 1 | 1 d | £149 |
|  | `CHU` | Chromium (Urine) | 1 | 5 d | £129 |
|  | `CBB` | Cobalt (Blood) | 1 | 14 d | £108 |
|  | `CBU` | Cobalt (Urine) | 1 | 14 d | £139 |
|  | `COT` | Cotinine (Serum) | 1 | 1 d | £81 |
|  | `DA3` | Drugs of Abuse Profile – Random Urine Sample/No Chain of Custody Plus Alcohol | 10 | 1 d | £155 |
|  | `KET` | Ketamine Screen (urine) | 1 | 1 d | £105 |
|  | `PB` | Lead (Blood) | 1 | 5 d | £81 |
|  | `LEU` | Lead (Urine) | 1 | 14 d | £115 |
|  | `MN` | Manganese (Serum) | 1 | 1 d | £85 |
|  | `HG` | Mercury (Blood) | 1 | 1 d | £99 |
|  | `MRU` | Mercury (Urine) | 1 | 1 d | £99 |
|  | `NIU` | Nickel (Urine) | 1 | 14 d | £137 |
|  | `SAL` | Salicylate | 1 | 1 d | £102 |
|  | `THA` | Thallium (Blood) | 1 | 8 d | £170.5 |
|  | `TOU` | Toluene (Urine) | 1 | 14 d | £209 |

---

## Swabs & samples — Amostras e swabs

`swabs` · 19 exames

| | código | exame | marcadores | prazo | venda |
|---|---|---|---|---|---|
|  | `PAP` | Cervical Cytology | 1 | 21 d | £155 |
|  | `CVC` | Cervical Cytology with HPV (HR mRNA types 16, 18 + others) | 3 | 21 d | £155 |
|  | `SCG` | Chlamydia/Gonorrhoea (PCR Swab) | 2 | 1 d | £119 |
|  | `TCG` | Chlamydia/Gonorrhoea PCR (Throat Swab) | 2 | 1 d | £119 |
|  | `CUL` | Culture (Any site) | 1 | — | £119 |
|  | `HSS` | Herpes Simplex I/II by PCR (Swab) | 2 | 2 d | £176 |
|  | `NCM` | Nail Clippings | 2 | 21 d | £129 |
|  | `SC` | Swab (Cervical) | 2 | 2 d | £125 |
|  | `SE` | Swab (Eye) | 1 | 2 d | £125 |
|  | `NS` | Swab (Nasal) | 1 | 2 d | £125 |
|  | `SO` | Swab (Oral) | 1 | 2 d | £125 |
|  | `SP` | Swab (Penile) | 1 | 2 d | £125 |
|  | `SR` | Swab (Rectal) | 1 | 2 d | £125 |
|  | `SKS` | Swab (Skin) | 1 | 2 d | £125 |
|  | `ST` | Swab (Throat) | 1 | 2 d | £125 |
|  | `SVU` | Swab (Vulval) | 1 | 2 d | £125 |
|  | `WS` | Swab (Wound) | 1 | 2 d | £125 |
|  | `SWC` | Swab for Culture (Any Site) | 1 | 2 d | £125 |
|  | `SVA` | VAGINAL SWAB | 1 | 2 d | £125 |

---

## Heart & cholesterol — Coração e colesterol

`cardiovascular` · 18 exames

| | código | exame | marcadores | prazo | venda |
|---|---|---|---|---|---|
|  | `AP1` | Apolipoprotein A1 | 1 | 1 d | £116 |
|  | `APB` | Apolipoprotein B | 1 | 1 d | £84 |
|  | `APE` | Apolipoprotein E (12 hours fasting) | 1 | 7 d | £205 |
|  | `BNP` | Brain Natriuretic Peptide (NT-pro BNP) | 1 | 1 d | £189 |
|  | `CHO` | Cholesterol - Total | 1 | 1 d | £21 |
|  | `LIP` | Cholesterol Lipid Profile | 7 | 1 d | £39 |
| **à venda** | `XLI` | Cholesterol Profile | 7 | 1 d | £59 |
|  | `CKM` | CK (MB Fraction) | 1 | 1 d | £88 |
|  | `CK` | Creatine Kinase | 1 | 1 d | £36 |
|  | `XHP` | Heart Health Profile | 3 | 1 d | £69 |
|  | `HHP` | Heart Health Profile | 8 | 1 d | £59 |
|  | `HOM` | Homocysteine (Quantitative) | 1 | 1 d | £149 |
|  | `L17` | LDL7 Subfractions | 9 | 14 d | £335 |
|  | `LPA` | Lipoprotein (a) | 1 | 1 d | £79 |
|  | `MYB` | Myoglobin (Serum) | 1 | 1 d | £137 |
|  | `PL2` | PLAC Test (Lp-PLA2) | 1 | 3 d | £163 |
|  | `TNI` | Troponin I High Sensitivity | 1 | 1 d | £159 |
|  | `VLD` | VLDL CHOLESTEROL | 1 | 8 d | £129 |

---

## Tumour markers — Marcadores tumorais

`tumour_markers` · 17 exames

| | código | exame | marcadores | prazo | venda |
|---|---|---|---|---|---|
|  | `5HI` | 5 HIAA | 2 | 6 d | £275 |
|  | `AFP` | Alpha Fetoprotein | 1 | 1 d | £135 |
|  | `CTO` | Calcitonin | 1 | 1 d | £204 |
|  | `125` | Cancer Antigen 125 | 1 | 1 d | £119 |
|  | `153` | Cancer Antigen 15-3 | 1 | 1 d | £119 |
|  | `199` | Cancer Antigen 19-9 | 1 | 1 d | £119 |
|  | `C50` | Cancer Antigen 50 (CA 50) | 1 | 5 d | £316.05 |
|  | `724` | Cancer Antigen 72-4 | 1 | 5 d | £176 |
|  | `CEA` | Carcino Embryonic Antigen | 1 | 1 d | £99 |
|  | `FTM` | Female Tumour Markers | 5 | 1 d | £279 |
|  | `FPS` | Free Prostate Specific Antigen | 1 | 1 d | £61 |
|  | `MTM` | Male Tumour Markers | 4 | 1 d | £269 |
|  | `NSE` | Neurone Specific Enolase | 1 | 5 d | £210 |
|  | `PR2` | Prostate Profile | 3 | 1 d | £79 |
|  | `XP2` | Prostate Profile | 3 | 1 d | £89 |
|  | `PSA` | Prostate Specific Antigen (Total) | 1 | 1 d | £39 |
|  | `NHU` | Ultimate Athlete Performance (with PSA) | 63 | 1 d | £219 |

---

## Thyroid — Tireoide

`thyroid` · 16 exames

| | código | exame | marcadores | prazo | venda |
|---|---|---|---|---|---|
|  | `FT3` | Free T3 (triiodothyronine) | 1 | 1 d | £39 |
|  | `FT4` | Free T4 (thyroxine) | 1 | 1 d | £43 |
|  | `RT3` | Reverse T3 | 1 | 21 d | £189 |
|  | `THB` | Thyroid Antibodies (incl. Thyroglobulin + Thyroid Peroxidase Antibodies) | 2 | 1 d | £85 |
| **à venda** | `XTF` | Thyroid Diagnosis & Monitoring | 2 | 1 d | £59 |
|  | `TF2` | Thyroid Full Profile | 5 | 1 d | £79 |
|  | `TF` | Thyroid Function - Diagnosis and Monitoring | 2 | 1 d | £49 |
|  | `TPO` | Thyroid Peroxidase Antibodies | 1 | 1 d | £39 |
|  | `TF3` | Thyroid Profile 3 | 3 | 1 d | £65 |
|  | `TSI` | Thyroid Receptor Antibodies | 1 | 5 d | £228 |
|  | `TSH` | Thyroid Stimulating Hormone | 1 | 1 d | £39 |
|  | `T4` | Thyroxine (Total) | 1 | 1 d | £69 |
|  | `TP` | Tiredness/Fatigue Profile | 18 | 1 d | £99 |
|  | `T3` | Triiodothyronine (T3) | 1 | 1 d | £139 |
|  | `WLT` | Weight-loss management + Thyroid | 22 | 1 d | £115 |
|  | `WLA` | Weight-loss management Advanced | 43 | 1 d | £179 |

---

## Allergy — Alergia

`allergy` · 15 exames

| | código | exame | marcadores | prazo | venda |
|---|---|---|---|---|---|
|  | `AL2` | Allergy Complete - 295 allergens tested | 1 | 14 d | £319 |
|  | `XAX` | Allergy Complete (295 allergens) | 2 | 5 d | £299 |
|  | `AGC` | Alpha Gal Components (related to red meat) | 3 | 4 d | £220 |
|  | `DIM` | Diamine Oxidase Activity | 1 | 14 d | £170.5 |
|  | `GAP` | Gluten Allergy Profile | 5 | 14 d | £499 |
|  | `F17` | Hazel nut IgE level | 1 | 1 d | £55 |
|  | `HIB` | Histamine (Blood) | 1 | 5 d | £279 |
|  | `ALL` | Individual Allergen | 1 | 1 d | £55 |
|  | `F84` | KIWI IGE | 1 | 1 d | £55 |
|  | `4A` | Nut Panel | 13 | 1 d | £279 |
|  | `F13` | Peanut IgE level | 1 | 1 d | £55 |
|  | `FB0` | Pineapple IgE level | 1 | 1 d | £55 |
|  | `F10` | Sesame Ige | 1 | 1 d | £55 |
|  | `FM5` | Sheep Milk IgE | 1 | 1 d | £55 |
|  | `F14` | Soybean IgE level | 1 | 1 d | £55 |

---

## General health — Saúde geral

`general` · 15 exames

| | código | exame | marcadores | prazo | venda |
|---|---|---|---|---|---|
|  | `D4L` | Biochemistry (16 Parameters) & Haematology Profile plus Cholesterol Profile (TDL Code DL4L) | 29 | 1 d | £86 |
|  | `D2L` | Biochemistry (24 Parameters) & Haematology Profile plus Full Cholesterol Profile (TDL Code DL2L) | 35 | 1 d | £94 |
|  | `XM1` | General Health Profile | 19 | 1 d | £89 |
|  | `ML1` | General Health Profile | 19 | 1 d | £89 |
|  | `D6L` | General Well Person Profile plus Full Cholesterol Profile (DL6L) | 42 | 1 d | £151 |
|  | `ML2P` | Premier General Health Profile | 34 | 1 d | £99 |
|  | `ML7` | Well Man Premier Plus Profile | 50 | 1 d | £159 |
|  | `MG7` | Well Man Premier Profile (with Electrolytes) | 50 | 1 d | £165 |
|  | `D7L` | Well Man Profile - including Prostate Profile (DL7L) | 41 | 1 d | £189 |
|  | `MF7` | Well Man Profile (minus FBC) | 36 | 1 d | £149 |
|  | `ML6` | Well Person Premier Plus Profile | 39 | 1 d | £119 |
|  | `D8L` | Well Person Profile (DL8L) | 41 | 1 d | £129 |
|  | `MG6` | Well Person Profile (with Glucose, HbA1c & Electrolytes) | 45 | 1 d | £140 |
|  | `ML8` | Well Woman Premier Plus Profile | 47 | 1 d | £159 |
|  | `MG8` | Well Woman Premier Profile (with Electrolytes) | 57 | 1 d | £165 |

---

## Blood — Sangue

`haematology` · 15 exames

| | código | exame | marcadores | prazo | venda |
|---|---|---|---|---|---|
|  | `ANE` | Anaemia Profile | 17 | 1 d | £99 |
|  | `BG` | Blood Group (Handwritten Label Essential) | 1 | 1 d | £99 |
|  | `COD` | Coombs (Direct Antiglobulin Test) | 1 | 4 d | £129 |
|  | `FBC` | Full Blood Count (with 5 part White Cell Differential) | 15 | 1 d | £46.4 |
|  | `G6P` | G6PD | 1 | 1 d | £138 |
|  | `GLT` | GLUTATHIONE (RED CELL) | 1 | 1 d | £215 |
|  | `GLP` | GLUTATHIONE PEROXIDASE | 1 | 14 d | £119 |
|  | `HB` | Haemoglobin | 1 | 1 d | £49 |
|  | `HBL` | Haemoglobin Electrophoresis | 3 | 1 d | £129 |
|  | `HPT` | Haptoglobin | 1 | 5 d | £122.55 |
|  | `ICO` | Indirect Coombs | 1 | 2 d | £129 |
|  | `PRT` | Protein Electrophoresis including Immunoglobin | 7 | 1 d | £139 |
|  | `RTC` | Reticulocyte Count | 1 | 1 d | £43 |
|  | `SLC` | Serum Free Light Chains | 3 | 14 d | £279 |
|  | `SIC` | Sickle Cell Screen | 1 | 1 d | £129 |

---

## Kidneys — Rins

`kidney` · 15 exames

| | código | exame | marcadores | prazo | venda |
|---|---|---|---|---|---|
|  | `BJP` | Bence-Jones Protein | 1 | 2 d | £169 |
|  | `B2M` | Beta 2 Microglobulin (Serum) | 1 | 3 d | £221 |
|  | `BIC` | Bicarbonate | 1 | 1 d | £37 |
|  | `CRC` | Creatinine Clearance | 2 | 1 d | £71 |
|  | `CYC` | Cystatin C | 1 | 6 d | £136 |
|  | `KF` | Kidney function (no electrolytes) | 3 | 1 d | £49 |
|  | `KFT` | Kidney Function Profile - invluding Electrolytes | 5 | 1 d | £49 |
|  | `UMA` | Microalbumin (Urine) | 1 | 1 d | £75 |
|  | `OMB` | Osmolality (Serum) | 1 | 2 d | £135 |
|  | `OMU` | Osmolality (Urine) | 1 | 2 d | £135 |
|  | `RBP` | Retinol Binding Protein | 1 | 3 d | £105 |
|  | `UE` | Urea & Electrolytes | 4 | 1 d | £32 |
|  | `UA` | URIC ACID (URATE) | 1 | 1 d | £36 |
|  | `UUA` | URIC ACID (URINE) | 1 | 1 d | £57 |
|  | `ACR` | Urine albumin/Creatinine ratio | 3 | 1 d | £99 |

---

## Sexual health — Saúde sexual

`sexual_health` · 15 exames

| | código | exame | marcadores | prazo | venda |
|---|---|---|---|---|---|
|  | `CCG` | Chlamydia/Gonorrhoea (Urine) | 2 | 1 d | £119 |
|  | `CG1` | Chlamydia/Gonorrhoea PCR (Thin Prep) | 2 | 1 d | £119 |
|  | `XS6` | Female Sexual Health — Advanced Screen | 6 | 2 d | £189 |
|  | `HSA` | Herpes Simplex I/II Antibody Profile (IgG) | 2 | 1 d | £149 |
|  | `HUS` | Herpes Simplex I/II by PCR (Urine) | 1 | 2 d | £176 |
|  | `HSM` | Herpes Simplex I/II IgM | 1 | 1 d | £149 |
|  | `HV1` | HIV-1 RNA Viral Load by PCR | 1 | 2 d | £289 |
|  | `HIV` | HIV I & II Antibody & p24 Antigen Test | 1 | 1 d | £49 |
|  | `STS` | HIV/HBV/HCV (Early detection by PCR/NAAT) | 3 | 1 d | £349 |
|  | `HPH` | HPV (HR mRNA types 16, 18 + others) | 2 | 3 d | £119 |
|  | `SH5` | Male Sexual Health - Advanced Screen | 6 | 1 d | £179 |
|  | `XS5` | Male Sexual Health — Advanced Screen | 5 | 2 d | £189 |
|  | `SH4` | Sexual Health Bloods Only | 4 | 1 d | £129 |
|  | `SYP` | Syphilis TP (IgG/IgM) | 1 | 1 d | £65 |
|  | `TPP` | TPPA | 1 | 1 d | £69 |

---

## Blood clotting — Coagulação

`coagulation` · 13 exames

| | código | exame | marcadores | prazo | venda |
|---|---|---|---|---|---|
|  | `ATC` | Activated Protein C Resistance | 1 | 4 d | £175 |
|  | `AN3` | Antithrombin Ill | 1 | 3 d | £134 |
|  | `CL1` | Coagulation Profile 1 (Must reach lab within 2 hrs) | 4 | 3 d | £125.5 |
|  | `DDI` | D-Dimers (Fibrinogen Degradation Products) (Must reach lab within 2 hrs) | 1 | 3 d | £109 |
|  | `FII` | Factor II Prothrombin – G20210A mutation | 1 | 6 d | £299 |
|  | `FX5` | Factor V of Leiden | 1 | 7 d | £399 |
|  | `12F` | Factor VIII Assay | 1 | 7 d | £249 |
|  | `LUS` | Lupus Anticoagulant | 1 | 3 d | £159 |
|  | `LUP` | Lupus Anticoagulant and Anticardiolipin Antibodies (Hughes Syndrome) | 3 | 3 d | £319 |
|  | `PC` | Protein C activity | 1 | 4 d | £170 |
|  | `PTI` | Prothrombin Time | 1 | 5 d | £94 |
|  | `MLSB` | Sports Fitness Profile | 40 | 1 d | £119 |
|  | `NHW` | Ultimate Athlete Performance | 62 | 1 d | £209 |

---

## Diabetes & blood sugar — Diabetes e glicemia

`diabetes` · 11 exames

| | código | exame | marcadores | prazo | venda |
|---|---|---|---|---|---|
|  | `CPE` | C Peptide | 1 | 1 d | £189 |
|  | `XGH` | Diabetes — Diagnosis & Monitoring (HbA1c) | 1 | 1 d | £59 |
|  | `GHB` | Diabetes Diagnosis and Monitoring | 1 | 1 d | £45 |
|  | `FRA` | Fructosamine | 1 | 4 d | £101.59 |
|  | `GLU` | Glucose | 1 | 1 d | £39 |
|  | `BG5` | Glucose Tolerance Test/OGTT | 2 | 1 d | £259 |
|  | `INS` | Insulin | 1 | 1 d | £119 |
|  | `ISR` | Insulin Resistance (Fasting) | 3 | 1 d | £85 |
|  | `MSP` | Metabolic Syndrome Profile | 12 | 14 d | £389 |
|  | `MG2` | Premier Health Profile (with Glucose & Electrolytes) | 31 | 1 d | £104 |
|  | `WLM` | Weight-loss management | 20 | 1 d | £99 |

---

## Liver — Fígado

`liver` · 11 exames

| | código | exame | marcadores | prazo | venda |
|---|---|---|---|---|---|
|  | `API` | Alkaline Phosphatase lsoenzymes | 1 | 5 d | £302.25 |
|  | `A1A` | Alpha 1 Antitrypsin (Serum) | 1 | 2 d | £195.65 |
|  | `DBL` | Bilirubin (Direct/Indirect) | 3 | 1 d | £84 |
|  | `CER` | Ceruloplasmin | 1 | 2 d | £119 |
|  | `CHP` | Cholinesterase (Serum/Pseudo) | 1 | 7 d | £102 |
|  | `ELF` | Liver Fibrosis (Enhanced Liver Fibrosis ELF) | 1 | 7 d | £329 |
|  | `LFT` | Liver Function Tests | 8 | 1 d | £39 |
|  | `LKM` | Liver Kidney Microsomal Antibodies | 1 | 3 d | £129 |
|  | `P3P` | Procollagen III Peptide | 1 | 28 d | £199 |
|  | `TBI` | TOTAL BILEACID/BILE SALTS | 1 | 4 d | £79 |
|  | `BIL` | TOTAL BILIRUBIN | 1 | 1 d | £36 |

---

## Medication monitoring — Monitoramento de medicamento

`drug_monitoring` · 10 exames

| | código | exame | marcadores | prazo | venda |
|---|---|---|---|---|---|
|  | `6TH` | 6-Thioguanine Nucleotides | 1 | 14 d | £508 |
|  | `CRB` | Carbamazepine (Tegretol) | 1 | 1 d | £105 |
|  | `DIG` | Digoxin | 1 | 1 d | £183 |
|  | `PHE` | Epanutin (Phenytoin) | 1 | 1 d | £98 |
|  | `LAM` | Lamotrigine | 1 | 8 d | £182 |
|  | `OLA` | Olanzapine | 1 | 7 d | £269 |
|  | `PHN` | PHENYTOIN (EPANUTIN) | 1 | 1 d | £92.81 |
|  | `FK5` | Tacrolimus/Prograf (FK506) | 1 | 14 d | £149 |
|  | `TMT` | Thiopurine Methyl Transferase | 1 | 5 d | £279 |
|  | `VAL` | VALPROIC ACID (EPILIM) | 1 | 1 d | £111.62 |

---

## Digestion — Digestão

`digestive` · 7 exames

| | código | exame | marcadores | prazo | venda |
|---|---|---|---|---|---|
|  | `AMY` | Amylase | 1 | 1 d | £68 |
|  | `CAL` | Calprotectin | 1 | 1 d | £137.5 |
|  | `ELA` | Elastase (Faecal) | 1 | 7 d | £145 |
|  | `FOC` | Faecal Immunochemical Test (random faeces) | 1 | 1 d | £69 |
|  | `HAS` | H. pylori Antigen (Stool) | 1 | 1 d | £139 |
|  | `LPS` | Lipase | 1 | 1 d | £74 |
|  | `SRS` | Stool Reducing Substances | 1 | 5 d | £93 |

---

## Fertility & pregnancy — Fertilidade e gravidez

`fertility` · 6 exames

| | código | exame | marcadores | prazo | venda |
|---|---|---|---|---|---|
|  | `AMH` | Antimullerian Hormone (AMH Plus) | 1 | 1 d | £99 |
|  | `HCG` | Beta HCG (Quantitative) (Pregnancy) | 1 | 1 d | £55 |
|  | `FSH` | Follicle Stimulating Hormone (FSH) | 1 | 1 d | £39 |
|  | `INB` | Inhibin B | 1 | 7 d | £249 |
|  | `QHCG` | Pregnancy Test - Beta hCG (Quantitative) | 1 | 1 d | £55 |
|  | `XHC` | Pregnancy Test (Beta-HCG, quantitative) | 1 | 1 d | £59 |

---

## Metabolic — Metabólico

`metabolic` · 6 exames

| | código | exame | marcadores | prazo | venda |
|---|---|---|---|---|---|
|  | `APH` | Acid Phosphatase – Total | 1 | 6 d | £85 |
|  | `ALD` | Aldolase | 1 | 6 d | £97 |
|  | `LDH` | Lactate Dehydrogenase | 1 | 1 d | £43 |
|  | `ISO` | LDH LSOENZYMES | 1 | 7 d | £152 |
|  | `TPR` | Protein Total (Blood) | 1 | 1 d | £36 |
|  | `SRT` | SRT - Serotonin (Blood) | 1 | 14 d | £279 |

---

## Genetics — Genética

`genetics` · 5 exames

| | código | exame | marcadores | prazo | venda |
|---|---|---|---|---|---|
|  | `APG` | Apolipoprotein E genotype – E2, E3, E4 | 3 | 7 d | £580 |
|  | `BEN` | Breast Cancer NGS Panel – full sequencing across 14 genes + deletions/duplications. | 1 | 30 d | £2866 |
|  | `KAR` | Chromosome Analysis (Karyotyping) (Blood) | 1 | 7 d | £1125.5 |
|  | `HMD` | HFE gene (Haemochromatosis) – common mutations C282Y + H63D | 1 | 5 d | £419 |
|  | `CV1` | MTHFR COMMON VARIANTS | 1 | 21 d | £329 |

---

## Iron — Ferro

`iron` · 5 exames

| | código | exame | marcadores | prazo | venda |
|---|---|---|---|---|---|
|  | `CDT` | Carbohydrate Deficient Transferrin (CDT) | 1 | 7 d | £165 |
|  | `FE` | Iron | 1 | 1 d | £49 |
|  | `IOP` | Iron Overload Profile | 5 | 5 d | £459 |
|  | `ISP` | Iron Status Profile | 5 | 1 d | £49 |
| **à venda** | `XIS` | Iron Status Profile | 5 | 1 d | £69 |

---

## Bone & minerals — Ossos e minerais

`bone` · 4 exames

| | código | exame | marcadores | prazo | venda |
|---|---|---|---|---|---|
|  | `CA` | Calcium | 1 | 1 d | £36 |
|  | `NTX` | Collagen Type 1 Cross-Linked N-Telopeptide – NTX | 1 | 21 d | £223 |
|  | `SDP` | Crosslaps - Serum Deoxypyridinoline (DPD) | 1 | 5 d | £189 |
|  | `P1P` | Procollagen 1 Peptide N-Terminal (NTX) | 1 | 7 d | £429 |

---

## Inflammation — Inflamação

`inflammation` · 3 exames

| | código | exame | marcadores | prazo | venda |
|---|---|---|---|---|---|
|  | `CRP` | C-Reactive Protein (High Sensitivity) | 1 | 1 d | £35 |
|  | `ESR` | Erythrocyte Sedimentation Rate | 1 | 1 d | £39 |
|  | `DH` | Haematology Profile (DL3) | 11 | 1 d | £49 |

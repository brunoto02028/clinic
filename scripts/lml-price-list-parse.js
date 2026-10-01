// A leitura da planilha de preços da LML, separada do que escreve no banco
// (081, T-13).
//
// Está num módulo próprio para o teste exercer **estas** funções, e não uma
// cópia delas. O seed vizinho (`seed-lab-products.js`) tem uma lista mantida à
// mão em duas línguas de programação e um teste a compará-las; não vale repetir
// o arranjo quando dá para partilhar o código.

/**
 * Um leitor de CSV que respeita aspas.
 *
 * A coluna `Tests` lista a composição do painel **separada por vírgulas, dentro
 * de aspas** — `"Urine Volume (24 Hour Collection), 5-OH Indole Acetic Acid"`.
 * Um `split(',')` parte esse campo em dois e desloca todas as colunas
 * seguintes: o preço viraria o prazo e o prazo viraria composição. É o defeito
 * que justifica o leitor próprio em vez de uma dependência nova.
 */
function lerCsv(texto) {
  const linhas = [];
  let campo = '';
  let linha = [];
  let dentroDeAspas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (dentroDeAspas) {
      if (c === '"') {
        if (texto[i + 1] === '"') { campo += '"'; i++; } else { dentroDeAspas = false; }
      } else {
        campo += c;
      }
      continue;
    }
    if (c === '"') { dentroDeAspas = true; continue; }
    if (c === ',') { linha.push(campo); campo = ''; continue; }
    if (c === '\n' || c === '\r') {
      if (c === '\r' && texto[i + 1] === '\n') i++;
      linha.push(campo);
      if (linha.some((x) => x.trim() !== '')) linhas.push(linha);
      linha = [];
      campo = '';
      continue;
    }
    campo += c;
  }
  linha.push(campo);
  if (linha.some((x) => x.trim() !== '')) linhas.push(linha);

  const cabecalho = linhas.shift().map((h) => h.replace(/^﻿/, '').trim());
  return linhas.map((l) => {
    const o = {};
    cabecalho.forEach((h, i) => { o[h] = (l[i] || '').trim(); });
    return o;
  });
}

/** `£164.05` → `164.05`; o que não for número positivo vira `null`, não zero. */
function dinheiro(s) {
  const n = Number(String(s || '').replace(/[£,\s]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * `1 day` → 1, `2 weeks` → 14, `6 days` → 6.
 *
 * **Devolve `null` quando não entende**, e a tela trata prazo desconhecido.
 * Chutar um prazo é pior que não mostrar nenhum: a pessoa planeia a vida pelo
 * número que a gente escreve. Três dos 421 caem aqui.
 */
function prazoEmDias(s) {
  const t = String(s || '').toLowerCase();
  const m = t.match(/(\d+)/);
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n) || n <= 0) return null;
  if (t.includes('week')) return n * 7;
  if (t.includes('month')) return n * 30;
  if (t.includes('day')) return n;
  return null;
}

/** A composição do painel. Um exame de um só marcador devolve um item. */
function composicao(s) {
  return String(s || '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
}

/**
 * Conserta o caractere que veio estragado da planilha.
 *
 * Doze dos 421 nomes trazem `U+201A` (a vírgula baixa, `‚`) onde a origem tinha
 * outra coisa — e **são nomes que o paciente lê**: `Acid Phosphatase ‚ Total`,
 * `Human Herpes Virus ‚ 8 (IgG)`, `Leptospirosis (Weil‚s Disease)`. Deixar
 * assim põe um sinal de pontuação perdido no meio do nome de um exame.
 *
 * A regra é determinística, e sai da medição dos doze casos: **onze são
 * separador** (vem com espaço de um lado ou dos dois) e **um é apóstrofo**
 * (`Weil‚s`, colado a um `s`). Então:
 *
 * - seguido de `s` e fim de palavra → apóstrofo;
 * - caso contrário → travessão.
 *
 * Se um dia a planilha vier limpa, isto não faz nada — e o teste que fixa os
 * doze casos cai, que é o aviso certo de que a origem mudou.
 */
function nomeLimpo(s) {
  return String(s || '')
    .replace(/‚(s\b)/g, "'$1")
    .replace(/\s*‚\s*/g, ' – ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

module.exports = { lerCsv, dinheiro, prazoEmDias, composicao, nomeLimpo };

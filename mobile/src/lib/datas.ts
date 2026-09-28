/**
 * Data digitada → ISO, e de volta.
 *
 * Ninguém digita `1990-06-10`. Quem preenche um formulário escreve
 * `10/06/1990`, e o `new Date()` do outro lado entende isso como data
 * inválida — ou, pior, como 6 de outubro, dependendo do trecho de código.
 *
 * Isto morava dentro de `profile-edit.tsx`. Passou a morar aqui quando a tela
 * de dependentes precisou da mesma conversão (091 T-2): a data de nascimento
 * de um dependente é o que decide a faixa de referência do exame dele, e é o
 * último lugar onde vale a pena ter duas implementações parecidas.
 */

/** `DD/MM/YYYY` → `YYYY-MM-DD`. O que já vier em ISO passa direto. */
export function paraIsoDate(v: string): string | undefined {
  const limpo = v.trim();
  if (!limpo) return undefined;
  const br = limpo.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return br ? `${br[3]}-${br[2]}-${br[1]}` : limpo;
}

/** `YYYY-MM-DD` (ou ISO completo) → `DD/MM/YYYY`, para preencher o campo. */
export function paraCampoDeData(iso: string | null | undefined): string {
  if (!iso) return "";
  const [d] = String(iso).split("T");
  const m = d.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
}

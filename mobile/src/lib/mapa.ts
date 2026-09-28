import { Platform, Linking } from "react-native";

/**
 * Abre um endereço no mapa do aparelho.
 *
 * O Bruno: *"tem como a pessoa clicar e ir direto para o mapa e ter mais
 * informações do local?"* O mapa é a parte que **não depende do laboratório**:
 * basta o endereço, e ele vem no ponto.
 *
 * `maps:` no iOS e `geo:` no Android abrem o app nativo; a busca do Google
 * Maps é a queda para quando nenhum dos dois responde, que é o caso do
 * navegador.
 *
 * Mora aqui, e não na tela, porque duas telas mostram ponto de coleta desde a
 * 091 — e um helper copiado é um helper que diverge.
 */
export async function abrirNoMapa(nome: string, endereco: string): Promise<void> {
  const busca = encodeURIComponent(`${nome}, ${endereco}`);
  const nativo = Platform.OS === "ios" ? `maps:0,0?q=${busca}` : `geo:0,0?q=${busca}`;
  try {
    if (await Linking.canOpenURL(nativo)) {
      await Linking.openURL(nativo);
      return;
    }
  } catch {
    /* um mapa que não abre não pode derrubar a tela */
  }
  await Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${busca}`).catch(() => {});
}

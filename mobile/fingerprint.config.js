/**
 * O que conta como "mudou o lado nativo".
 *
 * A `runtimeVersion` do app é uma impressão digital: um update OTA só é
 * entregue a um binário cuja digital bate. Isso é a proteção certa — impede
 * que JavaScript novo caia num app que não tem o código nativo que ele precisa.
 *
 * Mas o `eas.json` entra nessa conta por padrão (`reasons: ["easBuild"]`), e
 * ele descreve **como construir e submeter**, não o que o app contém.
 * Acrescentar o id do app no App Store Connect — que é dado de submissão, não
 * de runtime — mudou a digital e cortou o canal de update de um binário já
 * instalado no celular de alguém. O update foi publicado e não chegou, sem
 * erro em lugar nenhum. Aconteceu em 24/09/2026.
 *
 * Fora da conta, então. Uma mudança que de fato afete o nativo continua
 * mudando a digital, porque vem de outro lugar: dependências, plugins do
 * config, `app.json`, os arquivos de `ios/` e `android/`.
 */
module.exports = {
  ignorePaths: ["eas.json"],
};

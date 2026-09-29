/**
 * O Daily nativo, atrás de uma porta que o navegador consegue abrir.
 *
 * `@daily-co/react-native-daily-js` arrasta `@daily-co/react-native-webrtc`,
 * que **empacota** no web e **quebra ao carregar**:
 *
 * ```
 * Uncaught Error: Cannot read properties of undefined
 *   (reading 'startMediaDevicesEventMonitor')
 *   node_modules/@daily-co/react-native-webrtc/lib/module/MediaDevices.js
 * ```
 *
 * E quebra **na abertura do app inteiro**, não na tela de vídeo: o
 * `expo-router` varre `app/` e importa todas as rotas, então uma tela derruba
 * todas. É o mesmo desenho do `stripe-nativo.ts`, e a segunda metade do mesmo
 * problema — aquele consertou o empacotamento, este conserta a execução.
 *
 * Por que isto importa fora do web: era o que impedia o QA de abrir qualquer
 * tela do app num navegador, e sem isso as capturas para as lojas não existem.
 */
export { default, DailyMediaView } from "@daily-co/react-native-daily-js";
export type {
  DailyCall,
  DailyEvent,
  DailyParticipant,
} from "@daily-co/react-native-daily-js";

/**
 * O que o navegador recebe no lugar do Daily nativo.
 *
 * Consulta por vídeo é coisa de aplicativo: a chamada usa WebRTC nativo, com
 * câmera e microfone do aparelho, e o web do paciente não é alvo — o app é.
 *
 * Este arquivo existe para que **o app abra no navegador**, e com ele o QA
 * consiga medir as telas e as lojas ganhem capturas. A tela de vídeo, aberta
 * aqui, diz que a chamada acontece no aplicativo em vez de explodir na cara de
 * quem abriu.
 */
import type { ReactNode } from "react";
import { createElement, Fragment } from "react";

export type DailyCall = any;
export type DailyEvent = string;
export type DailyParticipant = any;

const semSuporte = () => {
  throw new Error("Video consultations run in the BPR app, not in a browser.");
};

/** Um retângulo vazio: nenhuma câmera existe aqui. */
export function DailyMediaView(_props: {
  videoTrack?: unknown;
  audioTrack?: unknown;
  mirror?: boolean;
  objectFit?: string;
  style?: unknown;
  children?: ReactNode;
}) {
  return createElement(Fragment, null, null);
}

export default {
  createCallObject: semSuporte,
};

import { View, Pressable, Linking, Alert } from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Screen, Text, Spinner, Card } from "@/components/ui";
import { NonEmergencyNotice } from "@/components/NonEmergencyNotice";
import { useTheme } from "@/theme/useTheme";
import { openCheckout } from "@/lib/checkout";
import {
  fetchConnections, disconnectProvider, syncProvider, fetchConnectUrl, OW_PROVIDERS,
  fetchMonitoringConsent, acceptMonitoringConsent, resubscribeWithings,
} from "@/api/wearables";
import { Button } from "@/components/ui";
import { useLang, t as tr } from "@/lib/i18n";
import { formatDate } from "@/lib/format";
import { PlanGate } from "@/components/PlanGate";
import { LoadFailure } from "@/components/LoadFailure";

function WearablesScreen() {
  const t = useTheme();
  const lang = useLang();
  // The provider sends the patient back to bprclinic://wearables?connected=…
  // and nothing read it: authorising and refusing looked identical — the same
  // list, no word either way. The web has always said which happened.
  const { connected, error: oauthError } = useLocalSearchParams<{ connected?: string; error?: string }>();
  const returnMsg =
    connected === "1"
      ? tr(lang, { en: "Device connected. Data will sync shortly.", pt: "Dispositivo conectado. Os dados vão sincronizar em breve." })
      : connected === "0"
        ? tr(lang, { en: "We could not connect that device.", pt: "Não foi possível conectar esse dispositivo." })
        : null;
  const qc = useQueryClient();
  const { data: connections, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["wearable-connections"],
    queryFn: fetchConnections,
  });

  const disconnectMut = useMutation({
    mutationFn: disconnectProvider,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wearable-connections"] }),
    onError: (e) => Alert.alert(tr(lang, { en: "Error", pt: "Erro" }), (e as Error).message),
  });

  /**
   * A sincronia diz **o que trouxe**, e nao que comecou.
   *
   * O Bruno: *"quando esta sincronizando, eu preciso saber o tempo,
   * acompanhar."* Dizia *"os seus dados serao atualizados em breve"* — uma
   * promessa sem prazo e sem resultado, e a tela ficava igual.
   *
   * A rota **ja devolvia** os numeros; era a tela que os deitava fora. E um
   * deles diagnostica o caso dele: `bloodPressureRead` conta o que a Withings
   * **devolveu**, salvo ou nao. Com ele, estas duas deixam de ser a mesma tela
   * muda:
   *
   * - *"a Withings nao tem nada"* — o aparelho nao mediu, ou nao subiu;
   * - *"veio 1 leitura e foi para outro lugar"* — chegou, e esta na caixa de
   *   atribuicao da clinica, porque o aparelho e partilhado.
   */
  const syncMut = useMutation({
    mutationFn: syncProvider,
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["wearable-connections"] });
      qc.invalidateQueries({ queryKey: ["wearable-data"] });
      const salvas = r.bloodPressure ?? 0;
      const vieram = r.bloodPressureRead ?? 0;
      const outros = (r.activityDays ?? 0) + (r.sleepNights ?? 0) + (r.vitalsDays ?? 0) + (r.ecgRecords ?? 0);
      /**
       * **A pressao tem a sua propria frase, sempre** — e nao um ramo que os
       * outros dados apagam.
       *
       * A primeira versao punha *"veio N e foi para a clinica"* num `else if`,
       * depois de *"salvas ou outros dias"*. O Bruno carregou em Sync e leu
       * *"0 leituras novas, 5 dias de outros dados"* — os cinco dias de balanca
       * e relogio **engoliram** a unica linha que respondia a pergunta dele.
       *
       * O numero que diagnostica nao pode depender de nao ter chegado mais
       * nada: `salvas` e `vieram` respondem coisas diferentes, e as duas
       * precisam de sair.
       */
      /**
       * **Nesta ligacao a pressao nunca e pedida** — dizer "nenhuma leitura"
       * seria verdade sobre ela e mentira sobre o aparelho.
       *
       * Quando a conta esta ligada duas vezes, a pessoal nao processa pressao:
       * `ingestWithings` nem chega a perguntar a Withings por ela. Entao tanto
       * "salvas" como "devolvidas" dao **sempre zero** aqui, por desenho.
       *
       * Foi o que o Bruno ia ler a seguir: *"nenhuma leitura de pressao nesta
       * janela"*, com a medicao dele visivel na app da Withings. Uma frase
       * correta sobre o objeto errado — o mesmo defeito que a tela da ficha
       * tinha, e que este lote acabou de corrigir do outro lado.
       */
      const pressaoVemDaClinica = (connections ?? []).some(
        (c) => c.provider?.toUpperCase() === "WITHINGS" && c.pressaoPelaClinica === true
      );
      const linhas: string[] = [];
      if (pressaoVemDaClinica) {
        linhas.push(
          tr(lang, {
            en: "Blood pressure for this account comes in through the clinic's device — it is not fetched here.",
            pt: "A pressão desta conta entra pelo aparelho da clínica — não é buscada por aqui.",
          })
        );
      } else if (vieram > salvas) {
        linhas.push(
          tr(lang, {
            en: `Withings returned ${vieram} blood-pressure reading(s); ${salvas} went into your record. The rest are handled by the clinic's device.`,
            pt: `A Withings devolveu ${vieram} leitura(s) de pressão; ${salvas} entraram no seu prontuário. O resto entra pelo aparelho da clínica.`,
          })
        );
      } else if (salvas > 0) {
        linhas.push(
          tr(lang, {
            en: `${salvas} new blood-pressure reading(s).`,
            pt: `${salvas} leitura(s) nova(s) de pressão.`,
          })
        );
      } else {
        linhas.push(
          tr(lang, {
            en: "No blood-pressure readings in this window.",
            pt: "Nenhuma leitura de pressão nesta janela.",
          })
        );
      }
      if (outros > 0) {
        linhas.push(
          tr(lang, {
            en: `${outros} day(s) of other data.`,
            pt: `${outros} dia(s) de outros dados.`,
          })
        );
      }
      const texto = linhas.join(" ");
      Alert.alert(tr(lang, { en: "Sync", pt: "Sincronização" }), texto);
    },
    onError: (e) => Alert.alert(tr(lang, { en: "Error", pt: "Erro" }), (e as Error).message),
  });

  // Pedir de novo, sem refazer a autorização: os tokens já são nossos, o que
  // faltou foi a Withings aceitar mandar. Antes disto o único remédio era
  // desconectar e autorizar tudo outra vez.
  const resubMut = useMutation({
    mutationFn: resubscribeWithings,
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["wearable-connections"] });
      Alert.alert(
        tr(lang, { en: "Device", pt: "Aparelho" }),
        res.delivery === "receiving"
          ? tr(lang, {
              en: "Done — Withings will send your measurements now.",
              pt: "Pronto — a Withings vai enviar suas medições agora.",
            })
          : tr(lang, {
              en: "Withings still has not confirmed. Your clinic can see this too.",
              pt: "A Withings ainda não confirmou. Sua clínica também consegue ver isso.",
            })
      );
    },
    onError: (e) => Alert.alert(tr(lang, { en: "Error", pt: "Erro" }), (e as Error).message),
  });

  const connectedProviders = new Set((connections || []).map((c) => c.provider.toLowerCase()));

  // The patient says once that they read the non-emergency notice before the
  // first device is connected (activity 074, T-13). The server refuses without
  // it; asking here means the refusal never has to happen.
  const { data: consent } = useQuery({
    queryKey: ["monitoring-consent"],
    queryFn: fetchMonitoringConsent,
    retry: false,
  });
  const acceptMut = useMutation({
    mutationFn: acceptMonitoringConsent,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["monitoring-consent"] }),
    onError: (e) => Alert.alert(tr(lang, { en: "Error", pt: "Erro" }), (e as Error).message),
  });

  const connectMut = useMutation({
    mutationFn: fetchConnectUrl,
    // A autorização do fabricante também acontece dentro do app: sair para o
    // Safari no meio de um OAuth é o mesmo defeito do pagamento (083).
    onSuccess: (url) => { void openCheckout(url); },
    onError: (e) => Alert.alert(
      tr(lang, { en: "Devices", pt: "Dispositivos" }),
      (e as Error).message
        || tr(lang, {
          en: "We could not start the connection.",
          pt: "Não foi possível iniciar a conexão.",
        }),
    ),
  });

  return (
    <Screen scroll testID="wearables-screen">
      <Stack.Screen options={{ headerShown: true, title: tr(lang, { en: "Devices", pt: "Dispositivos" }), headerStyle: { backgroundColor: t.colors.background }, headerTintColor: t.colors.text, headerShadowVisible: false }} />
      <View style={{ gap: 20 }}>
        {/* Conectar um aparelho é o momento em que o paciente passa a esperar
            que alguém esteja olhando (activity 074, T-13). */}
        <NonEmergencyNotice />

        {consent && !consent.accepted && (
          <Card>
            <Text variant="caption" style={{ marginBottom: 8 }}>
              {tr(lang, {
                en: "Confirm you have read the notice above to connect a device.",
                pt: "Confirme que você leu o aviso acima para conectar um aparelho.",
              })}
            </Text>
            <Button
              title={tr(lang, { en: "I have read and understood", pt: "Li e entendi" })}
              onPress={() => acceptMut.mutate()}
              loading={acceptMut.isPending}
            />
          </Card>
        )}

        {returnMsg && (
          <Card accent={connected === "1" ? "health" : "work"}>
            <Text variant="caption" color={connected === "1" ? t.colors.ok : t.colors.bad}>
              {returnMsg}{oauthError ? ` (${oauthError})` : ""}
            </Text>
          </Card>
        )}
        <Text variant="caption" color={t.colors.textSecondary}>
          {tr(lang, {
            en: "Connect your wearable to sync sleep, activity and recovery data automatically.",
            pt: "Conecte seu wearable para sincronizar dados de sono, atividade e recuperação automaticamente.",
          })}
        </Text>

        {/* `wearable-data` had no entry point anywhere in the app — it was the
            one screen the navigation pass missed, reachable only by typed URL.
            Shown once something is connected, since it has nothing to plot
            otherwise. */}
        {connectedProviders.size > 0 && (
          <Pressable
            onPress={() => router.push("/(app)/(clinica)/wearable-data")}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingVertical: 12,
              paddingHorizontal: 14,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: t.colors.border,
              backgroundColor: pressed ? t.colors.surfaceMuted : "transparent",
            })}
          >
            <Text variant="label">{tr(lang, { en: "View my data", pt: "Ver meus dados" })}</Text>
            <Ionicons name="chevron-forward" size={16} color={t.colors.textMuted} />
          </Pressable>
        )}

        {isLoading ? (
          <Spinner center />
        ) : isError ? (
          /* A failed read showed every provider as disconnected with a live
             "Connect" button — an invitation to re-authorise a device that is
             already linked. */
          <LoadFailure error={error} onRetry={() => refetch()} />
        ) : (
          <View style={{ gap: 12 }}>
            {/* O aviso de não emergência fica no topo, e a lista é longa: quem
                rola até o aparelho que quer conectar vê sete botões apagados e
                nenhuma explicação — o motivo ficou quatrocentos pixels acima.
                Um botão desabilitado sem motivo ao lado é o app parecendo
                quebrado (achado no iPhone, 24/09/2026). */}
            {consent && !consent.accepted && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  backgroundColor: t.colors.warnSoft,
                  borderWidth: 1,
                  borderColor: t.colors.warn,
                  borderRadius: t.radius.md,
                  padding: 12,
                }}
              >
                <Ionicons name="lock-closed-outline" size={18} color={t.colors.warn} />
                <Text variant="caption" color={t.colors.warn} style={{ flex: 1 }}>
                  {tr(lang, {
                    en: "Read and accept the notice above to connect a device.",
                    pt: "Leia e aceite o aviso acima para conectar um aparelho.",
                  })}
                </Text>
              </View>
            )}
            {/* Só o que a clínica providenciou de fato — mais qualquer aparelho
                que este paciente já tenha ligado, para que uma conexão viva não
                suma da tela por causa de um interruptor. */}
            {OW_PROVIDERS.filter((p) => p.enabled || connectedProviders.has(p.key)).map((p) => {
              const isConnected = connectedProviders.has(p.key);
              const conn = (connections || []).find((c) => c.provider.toLowerCase() === p.key);
              // "Conectado" só dizia que a autorização deu certo. Se a Withings
              // não confirmou o envio, o aparelho está autorizado e mudo — e
              // pintar isso de verde era a parte pior do problema.
              const delivery = conn?.delivery;
              /**
               * Tres perguntas diferentes, e so a ultima e sobre hoje (114 T-2).
               *
               * O Bruno: *"nao pode ter uma luz verde dizendo que esta
               * conectado quando a verdade nao esta."*
               *
               * - `isConnected` — a autorizacao deu certo **um dia**;
               * - `delivery` — o provedor prometeu avisar;
               * - `conn.silent` — **nao chega nada ha dias**.
               *
               * A terceira faltava aqui: uma ligacao podia estar `receiving` e
               * calada ha uma semana, e a tela pintava verde.
               */
              const naoEntrega = delivery === "silent" || delivery === "partial" || delivery === "unchecked";
              const calada = conn?.silent === true;
              // A ligacao **partida** — o provedor recusou o token, ou a
              // autorizacao caiu. Ate o QA da 114 ela nem chegava aqui: a rota
              // filtrava por `CONNECTED` e o paciente via o convite *Connect*,
              // como se nunca tivesse ligado nada.
              const quebrada = conn?.status === "ERROR";
              // A pressao desta conta entra pela ligacao da clinica: esta e
              // muda para pressao de proposito, e um medidor so mede pressao.
              // Sem isto a tela mandava reconectar um aparelho que nao tem
              // nada de errado — achado do Bruno na propria tela, 30/09.
              const pelaClinica = conn?.pressaoPelaClinica === true;
              const silent = isConnected && !pelaClinica && (naoEntrega || calada || quebrada);

              return (
                <View
                  key={p.key}
                  /**
                   * **Em coluna, e nao em linha** (achado do Bruno, 30/09).
                   *
                   * Era `flexDirection: "row"` com o texto a esquerda e tres
                   * botoes a direita. Enquanto a linha de estado era curta,
                   * coube; quando ela passou a dizer *"Nada chega ha 6 dias.
                   * Verifique o aparelho, ou reconecte."*, o **Remover saiu da
                   * tela** — cortado pela margem direita, no telefone dele.
                   *
                   * O texto que explica o problema e os botoes que o resolvem
                   * disputavam a mesma largura, e quanto pior o problema, mais
                   * longo o texto e menos espaco sobrava para a solucao. Agora
                   * a informacao ocupa a largura toda e os botoes vem por
                   * baixo, quebrando linha quando precisam.
                   */
                  style={{
                    flexDirection: "column",
                    gap: 12,
                    padding: 16,
                    backgroundColor: silent
                      ? t.colors.warnSoft
                      : isConnected
                      ? t.colors.okSoft
                      : t.colors.surfaceMuted,
                    borderRadius: t.radius.lg,
                    borderWidth: 1,
                    borderColor: silent ? t.colors.warn : isConnected ? t.colors.ok : t.colors.border,
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <Text style={{ fontSize: 28 }}>{p.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text variant="label" style={{ fontWeight: "600" }}>
                        {p.name}
                      </Text>
                      {/* **A data que significa dado.** Dizia "Último sync",
                          que e quando falamos com o provedor — com ou sem
                          medicao. Era a linha que fazia sete dias de silencio
                          parecerem um dia normal. */}
                      {isConnected && pelaClinica && (
                        <Text variant="caption" color={t.colors.textSecondary} style={{ marginTop: 2 }}>
                          {tr(lang, {
                            en: "Your blood pressure comes in through the clinic's device.",
                            pt: "Sua pressão arterial entra pelo aparelho da clínica.",
                          })}
                        </Text>
                      )}
                      {isConnected && !pelaClinica && (
                        <Text variant="caption" color={t.colors.textSecondary} style={{ marginTop: 2 }}>
                          {conn?.lastReadingAt
                            ? `${tr(lang, { en: "Last reading", pt: "Última leitura" })}: ${formatDate(conn.lastReadingAt, lang)}`
                            : tr(lang, { en: "No measurement yet", pt: "Nenhuma medição ainda" })}
                        </Text>
                      )}
                      {silent && (
                        /* Sem `maxWidth` cravado: ele existia para a frase nao
                           empurrar os botoes que ficavam ao lado, e agora eles
                           estao por baixo. Uma largura fixa numa frase que muda
                           de tamanho conforme o defeito e um limite que aperta
                           justamente quando ha mais a dizer. */
                        <Text variant="caption" color={t.colors.warn} style={{ marginTop: 2 }}>
                          {quebrada
                            ? tr(lang, {
                                en: "The connection stopped working. Reconnect to start receiving again.",
                                pt: "A conexão parou de funcionar. Reconecte para voltar a receber.",
                              })
                            : calada && !naoEntrega
                            ? tr(lang, {
                                en: `Nothing has arrived for ${conn?.daysSilent ?? "?"} days. Check the device, or reconnect.`,
                                pt: `Nada chega há ${conn?.daysSilent ?? "?"} dias. Verifique o aparelho, ou reconecte.`,
                              })
                            : delivery === "unchecked"
                            ? tr(lang, {
                                en: "We have not been able to confirm it is sending.",
                                pt: "Não conseguimos confirmar que está enviando.",
                              })
                            : delivery === "silent"
                            ? tr(lang, {
                                en: "Authorised, but not sending measurements yet.",
                                pt: "Autorizado, mas ainda não está enviando medições.",
                              })
                            : conn?.missingBloodPressure
                            ? tr(lang, {
                                en: "Not sending your blood pressure.",
                                pt: "Não está enviando sua pressão arterial.",
                              })
                            : tr(lang, {
                                en: "Sending only part of your measurements.",
                                pt: "Enviando só parte das suas medições.",
                              })}
                        </Text>
                      )}
                    </View>
                  </View>

                  {isConnected ? (
                    <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                      {silent && p.key === "withings" && (
                        <Pressable
                          onPress={() => resubMut.mutate()}
                          disabled={resubMut.isPending}
                          testID="wearables-resubscribe"
                          style={{
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                            borderRadius: 8,
                            backgroundColor: t.colors.warn,
                            opacity: resubMut.isPending ? 0.6 : 1,
                          }}
                        >
                          <Text style={{ fontSize: 12, fontWeight: "600", color: t.colors.accentFg }}>
                            {resubMut.isPending ? "..." : tr(lang, { en: "Fix", pt: "Corrigir" })}
                          </Text>
                        </Pressable>
                      )}
                      <Pressable
                        onPress={() => syncMut.mutate(p.key)}
                        disabled={syncMut.isPending}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          borderRadius: 8,
                          backgroundColor: t.colors.health,
                          opacity: syncMut.isPending ? 0.6 : 1,
                        }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: "600", color: t.colors.accentFg }}>
                          {syncMut.isPending ? "..." : tr(lang, { en: "Sync", pt: "Sincronizar" })}
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() =>
                          Alert.alert(
                            tr(lang, { en: "Disconnect", pt: "Desconectar" }),
                            tr(lang, { en: `Disconnect ${p.name}?`, pt: `Desconectar ${p.name}?` }),
                            [
                              { text: tr(lang, { en: "Cancel", pt: "Cancelar" }), style: "cancel" },
                              {
                                text: tr(lang, { en: "Disconnect", pt: "Desconectar" }),
                                style: "destructive",
                                onPress: () => disconnectMut.mutate(p.key),
                              },
                            ],
                          )
                        }
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: t.colors.bad,
                        }}
                      >
                        <Text style={{ fontSize: 12, color: t.colors.bad }}>{tr(lang, { en: "Remove", pt: "Remover" })}</Text>
                      </Pressable>
                    </View>
                  ) : (
                    <Pressable
                      onPress={() => connectMut.mutate(p.key)}
                      // A recusa que vale é a do servidor; isto evita mandar o
                      // paciente para o provedor só para voltar com um erro.
                      disabled={connectMut.isPending || (!!consent && !consent.accepted)}
                      style={{
                        paddingHorizontal: 16,
                        paddingVertical: 8,
                        borderRadius: 8,
                        backgroundColor: consent && !consent.accepted ? t.colors.surfaceMuted : t.colors.primary,
                        opacity: consent && !consent.accepted ? 0.6 : 1,
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: "600", color: consent && !consent.accepted ? t.colors.textMuted : t.colors.primaryFg }}>{tr(lang, { en: "Connect", pt: "Conectar" })}</Text>
                    </Pressable>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </View>
    </Screen>
  );
}

/**
 * Gated on `mod_devices`, the key that also governs the data screen. Devices
 * had no entry in the registry at all until now.
 */
export default function Wearables() {
  return (
    <PlanGate module="mod_devices">
      <WearablesScreen />
    </PlanGate>
  );
}

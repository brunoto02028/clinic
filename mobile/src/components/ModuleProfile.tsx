import { View } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Text, Card, Avatar, ListItem, Spinner } from "@/components/ui";
import { useAuth } from "@/store/auth";
import { fetchProfile } from "@/api/profile";
import { useTheme } from "@/theme/useTheme";
import { useLang, t as tr } from "@/lib/i18n";
import { useAreaSwitch } from "@/lib/areas";
import { fetchAccess } from "@/api/access";
import Constants from "expo-constants";
import { runningVersion } from "@/lib/app-updates";
import { ordenarSecoes } from "@/lib/ordenar-secoes";
import { agruparSecoes } from "@/lib/agrupar-secoes";

export interface ProfileSection {
  /** English canonical, Portuguese alongside — this menu was English-only, so
   *  a pt-BR patient read fourteen English entries under a Portuguese home. */
  title: { en: string; pt: string };
  icon: keyof typeof Ionicons.glyphMap;
  href: string;
  /**
   * O módulo que esta entrada abre, quando ela depende de um.
   *
   * **Sem isto, desligar um módulo para um paciente não tirava nada da tela
   * dele.** O servidor recusava (`patientGate`) e o `PlanGate` mostrava um
   * cadeado — mas a linha continuava no menu, e a pessoa tocava nela para
   * descobrir que não podia. É o mesmo erro dos botões de Google e Apple que
   * ficaram meses na tela de entrar sem provedor atrás: um caminho prometido
   * que não existe é pior que a ausência dele.
   *
   * Sem `module`, a entrada aparece sempre — é o caso da conta, dos termos e
   * do "como funciona", que não são módulo de ninguém.
   */
  module?: string;
  /**
   * O grupo do menu, **para as linhas que não têm módulo** (112 T-1).
   *
   * O grupo das outras vem do servidor, junto com os módulos, porque é ele que
   * sabe a que categoria cada módulo pertence. Estas não têm módulo por decisão
   * — faturas, termos, quem tem acesso, os avisos, a pressão — e por isso
   * declaram o grupo aqui, onde a linha é escrita.
   *
   * Um valor que não exista entre os grupos não quebra nada: a linha cai no
   * último bloco, sem cabeçalho, e continua visível. Um teste cobra a grafia,
   * porque cair no bloco de sobra em silêncio é o tipo de defeito que ninguém vê.
   */
  grupo?: "clinical" | "wellness" | "content" | "account";
}

/**
 * O menu do módulo (clinica, lab, ba).
 *
 * Era a aba "Perfil", e mostrava as duas coisas de uma vez: o cartão da conta
 * em cima — foto grande, nome, e-mail — e, embaixo, as quatorze entradas da
 * clínica mais as da conta mais o sair. Quem abria procurando o menu via o
 * perfil; quem abria procurando o perfil recebia o menu inteiro junto.
 *
 * Agora esta tela é só o menu, e a conta é a **primeira linha** dele, compacta,
 * levando para `/account`. É o padrão dos Ajustes do telefone, e é o que estava
 * faltando: uma tela, um assunto.
 *
 * `sections` continua sendo como cada módulo acrescenta as próprias entradas
 * sem este componente aprender sobre elas.
 */
export function ModuleProfile({ sections }: { sections?: ProfileSection[] } = {}) {
  const t = useTheme();
  const lang = useLang();
  const user = useAuth((s) => s.user);
  const { canSwitch, areaCount, switchArea } = useAreaSwitch();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: fetchProfile,
  });

  /**
   * A mesma chave que o `PlanGate` lê — uma resposta só, lida por dois.
   *
   * Sem resposta o menu mostra tudo, de propósito: uma falha de rede não é
   * uma revogação, e esconder metade do aplicativo no primeiro soluço de
   * conexão seria pior que a linha extra.
   */
  const { data: acesso } = useQuery({ queryKey: ["patient-access"], queryFn: fetchAccess });
  /**
   * Filtra e **ordena** — a mesma ordem do painel de permissões da clínica.
   *
   * O Bruno pediu que os dois reflitam a mesma ordem. Aqui vale para as três
   * áreas que passam por este componente, porque três arrumações diferentes no
   * mesmo aplicativo seria a coisa que ele acabou de mandar corrigir.
   *
   * Ordena **depois** de filtrar, não antes: o que muda é só o custo, e assim a
   * conta é feita sobre a lista que vai à tela.
   */
  const visiveis = ordenarSecoes(
    (sections ?? []).filter((s) => !s.module || !acesso || acesso.modules.includes(s.module)),
    lang
  );

  /**
   * Os blocos do menu — e o que sobra deles.
   *
   * O Bruno, 30/09/2026: *"a gente estar organizando a forma que o paciente ve
   * as liberdades da clinica, para que ele fique debaixo das subcategorias,
   * assim como esta nas permissoes la na area web da clinica."*
   *
   * O ponto delicado nao e agrupar: e **o que acontece com quem nao entra em
   * grupo nenhum**. O laboratorio passa por este mesmo componente com quatro
   * linhas sem modulo; um servidor antigo nao manda grupos; uma linha nova pode
   * nascer sem chave. Em todos esses casos a lista cai no ultimo bloco, **sem
   * cabecalho** — que e exatamente a tela de antes, e nao uma linha perdida.
   *
   * A ordem alfabetica continua valendo **dentro** de cada bloco: os grupos dao
   * o lugar, e a ordem resolve o resto.
   *
   * A conta esta em `agrupar-secoes.ts`, e nao aqui, porque o que precisa de
   * prova e o destino de quem nao tem grupo — e um teste de componente nao e
   * onde se cobra isso.
   */
  const blocos = agruparSecoes(visiveis, acesso?.grupos ?? []);

  const initials = profile
    ? `${profile.firstName?.[0] ?? ""}${profile.lastName?.[0] ?? ""}`.toUpperCase()
    : (user?.name?.[0] ?? "?").toUpperCase();

  const fullName = profile ? `${profile.firstName} ${profile.lastName}` : user?.name ?? "";
  const email = profile?.email ?? user?.email ?? "";

  if (isLoading) {
    return (
      <Screen testID="module-profile-screen">
        <Spinner center />
      </Screen>
    );
  }

  return (
    <Screen scroll testID="module-profile-screen">
      <View style={{ gap: 16 }}>
        <Card>
          <ListItem
            title={fullName}
            subtitle={email}
            icon={
              <Avatar
                label={initials}
                uri={profile?.profileImageUrl}
                size={40}
                round
                pillar="health"
              />
            }
            right={<Ionicons name="chevron-forward" size={16} color={t.colors.textMuted} />}
            onPress={() => router.push("/account")}
            last
            testID="account-row"
          />
        </Card>

        {blocos.map((b) => (
          <View key={b.chave} style={{ gap: 6 }}>
            {b.grupo && (
              <Text
                variant="caption"
                color={t.colors.textMuted}
                style={{ marginLeft: 4 }}
                testID={`grupo-${b.chave}`}
              >
                {tr(lang, b.grupo)}
              </Text>
            )}
            <Card>
              {b.itens.map((s, i) => (
                <ListItem
                  key={s.href}
                  title={tr(lang, s.title)}
                  icon={<Ionicons name={s.icon} size={18} color={t.colors.text} />}
                  right={<Ionicons name="chevron-forward" size={16} color={t.colors.textMuted} />}
                  onPress={() => router.push(s.href as any)}
                  last={i === b.itens.length - 1}
                />
              ))}
            </Card>
          </View>
        ))}

        {/* A saída para as outras áreas da conta — laboratório, BA, o estúdio.
            Fica aqui, no menu, e não só dentro de "Minha conta", porque é onde
            a pessoa já está olhando quando procura o que o app tem. Some com
            uma área só: um botão que abre uma escolha de um item não faz nada.
            Aparece em todos os módulos, então de qualquer área há volta. */}
        {canSwitch && (
          <Card>
            <ListItem
              title={tr(lang, { en: "Switch area", pt: "Trocar de área" })}
              subtitle={tr(lang, {
                en: `${areaCount} areas on this account`,
                pt: `${areaCount} áreas nesta conta`,
              })}
              icon={<Ionicons name="swap-horizontal-outline" size={18} color={t.colors.text} />}
              right={<Ionicons name="chevron-forward" size={16} color={t.colors.textMuted} />}
              onPress={switchArea}
              last
              testID="switch-area"
            />
          </Card>
        )}

        {/* Qual versão está rodando de fato.
            Existe para responder sem adivinhação a pergunta que custou horas
            em 24/09/2026: "o update chegou?". `embedded` verdadeiro significa
            que o app roda o JavaScript que veio dentro do binário — nenhum
            update aplicado. Também é o que o suporte vai pedir quando um
            paciente disser que algo não funciona. Fica no menu, e não na
            conta, porque é aqui que o Bruno já sabe olhar. */}
        {(() => {
          const v = runningVersion(Constants.expoConfig?.version ?? "?");
          return (
            <Text
              variant="caption"
              color={t.colors.textMuted}
              style={{ textAlign: "center", fontSize: 10, marginTop: 4 }}
              testID="running-version"
            >
              {`v${v.app}`}
              {v.embedded
                ? ` · ${tr(lang, { en: "build only", pt: "só o build" })}`
                : v.updateId
                ? ` · ${tr(lang, { en: "update", pt: "update" })} ${v.updateId}`
                : ""}
            </Text>
          );
        })()}
      </View>
    </Screen>
  );
}

import { Stack } from "expo-router";
import ModuleGuard from "@/components/ModuleGuard";
import { deviceLang, t as tr } from "@/lib/i18n";

/**
 * A âncora do módulo.
 *
 * Sem isto, entrar na clínica por `replace` — é o que o cadastro faz, mandando
 * o recém-cadastrado direto para a avaliação — monta este `<Stack>` com **uma
 * entrada só**. Sem rota embaixo não há seta, e `router.back()` não faz nada:
 * a pessoa preenche nove etapas, aperta Enviar, e a tela não muda.
 */
export const unstable_settings = {
  initialRouteName: "(tabs)",
};

export default function ClinicaLayout() {
  // O idioma vem do aparelho, não do paciente: este layout monta antes de
  // qualquer consulta ao perfil, e é só um rótulo de botão.
  const lang = deviceLang();

  return (
    <ModuleGuard module="clinica">
      <Stack
        screenOptions={{
          /**
           * Estava `false` no grupo inteiro — e a clínica era o **único**
           * módulo assim. Os outros cinco já tinham sido corrigidos, cada um
           * com o comentário "quem entrava no módulo não tinha como voltar".
           * A clínica ficou de fora, justo o módulo que o paciente usa.
           *
           * Com `false`, cada tela tinha que pedir o header na mão — e todo
           * caminho de render que não pede ficava sem saída: carregando, erro,
           * plano bloqueado. Era isso que prendia o paciente.
           *
           * O título fica vazio porque cada tela desenha o próprio no
           * conteúdo; as que definem `title` continuam sobrescrevendo.
           */
          headerShown: true,
          headerTitle: "",
          /**
           * `headerBackTitle: ""` não esconde nada: o iOS trata a string vazia
           * como ausente e cai no nome da rota anterior — que é o nome de um
           * grupo, com parênteses, na tela do paciente.
           */
          headerBackButtonDisplayMode: "minimal",
          headerStyle: { backgroundColor: "#F5F4F1" },
          headerTintColor: "#20242D",
          headerShadowVisible: false,
        }}
      >
        {/*
          As abas trazem a própria navegação e não levam header. O título aqui
          é cinto e suspensório: se um dia o rótulo do voltar reaparecer, o pior
          caso deixa de ser "(tabs)" e passa a ser uma palavra que o paciente
          entende.
        */}
        <Stack.Screen
          name="(tabs)"
          options={{
            headerShown: false,
            title: tr(lang, { en: "Health", pt: "Saúde" }),
          }}
        />
      </Stack>
    </ModuleGuard>
  );
}

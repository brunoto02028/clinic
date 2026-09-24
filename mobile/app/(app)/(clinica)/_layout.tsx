import { Stack } from "expo-router";
import ModuleGuard from "@/components/ModuleGuard";
import { deviceLang, t as tr } from "@/lib/i18n";

export default function ClinicaLayout() {
  // O idioma vem do aparelho, não do paciente: este layout monta antes de
  // qualquer consulta ao perfil, e é só um rótulo de botão.
  const lang = deviceLang();

  return (
    <ModuleGuard module="clinica">
      <Stack
        screenOptions={{
          headerShown: false,
          /**
           * O botão de voltar mostrava "(tabs)" e "(clinica)" — nomes de
           * pastas do nosso código, na tela do paciente.
           *
           * O iOS rotula o voltar com o título da rota **anterior**, e caindo
           * para o nome dela quando não há título. A rota anterior é um grupo,
           * e o nome de um grupo tem parênteses.
           *
           * `headerBackTitle: ""` não resolve: o iOS trata string vazia como
           * ausente e volta a cair no nome da rota. Quem esconde o rótulo é
           * isto, que a documentação do native-stack aponta:
           */
          headerBackButtonDisplayMode: "minimal",
        }}
      >
        {/*
          Cinto e suspensório. Se um dia a linha acima for ignorada — outra
          versão do native-stack, outra plataforma —, o iOS cai no título da
          rota anterior. Dando um título de verdade a ela, o pior caso deixa de
          ser um nome de pasta e passa a ser uma palavra que o paciente
          entende.
        */}
        <Stack.Screen
          name="(tabs)"
          options={{ title: tr(lang, { en: "Health", pt: "Saúde" }) }}
        />
      </Stack>
    </ModuleGuard>
  );
}

import { ModuleProfile, type ProfileSection } from "@/components/ModuleProfile";

/**
 * O menu de quem tem só o laboratório (083).
 *
 * Três entradas, não quatorze: prontuário, exercícios e mensagens são de quem
 * é paciente da clínica. O convite para virar paciente é o caminho de volta, e
 * está no `ModuleProfile` como qualquer outra linha — marcar a consulta é o
 * que faz a área clínica aparecer sozinha.
 */
const LAB_SECTIONS: ProfileSection[] = [
  { title: { en: "My orders", pt: "Meus pedidos" }, icon: "receipt-outline", href: "/(app)/(lab)/(tabs)/orders" },
  { title: { en: "How it works", pt: "Como funciona" }, icon: "help-circle-outline", href: "/(app)/(lab)/how-it-works" },
  // O Bruno, 27/09: *"se um pai ou uma mãe quiser cadastrar um dependente para
  // que esses exames saiam no nome da criança, precisamos ter essa opção."*
  // O mesmo nome do perfil da clínica: uma tela, um nome.
  { title: { en: "People I look after", pt: "Quem eu cuido" }, icon: "people-outline", href: "/(app)/(lab)/dependents" },
  { title: { en: "Terms & privacy", pt: "Termos & privacidade" }, icon: "shield-checkmark-outline", href: "/(app)/(clinica)/consent" },
];

export default function Profile() {
  return <ModuleProfile sections={LAB_SECTIONS} />;
}

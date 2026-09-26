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
  { title: { en: "Terms & privacy", pt: "Termos & privacidade" }, icon: "shield-checkmark-outline", href: "/(app)/(clinica)/consent" },
];

export default function Profile() {
  return <ModuleProfile sections={LAB_SECTIONS} />;
}

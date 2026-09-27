import { create } from "zustand";
// De `@/api/config`, e não de `@/api/client`: o cliente importa o empréstimo,
// e importar o cliente daqui fecharia um ciclo.
import { API_URL } from "@/api/config";
import { definirTokenEmprestado, registrarRenovador } from "@/lib/emprestimo";
import { tokenStorage } from "@/lib/secure-storage";
import type { Dependente } from "@/api/dependents";

/**
 * Ver a clínica como quem você cuida (091 T-7).
 *
 * O Bruno: *"se o paciente é uma criança, a mãe tem que fazer o cadastro e
 * colocar a criança como uma dependente. E é a criança que está fazendo o
 * tratamento de reabilitação."*
 *
 * ## Como funciona
 *
 * O servidor emite um token curto cujo `sub` é a criança. Todas as telas
 * clínicas do app leem a sessão, então elas passam a mostrar a agenda, o
 * protocolo e os exercícios **dela** sem nenhuma mudança — que era a única
 * alternativa honesta a tocar em dezenas de telas, uma a uma.
 *
 * ## Por que isto mora na memória, e não no armazenamento seguro
 *
 * **De propósito.** A criança nunca tem sessão própria e durável: quem tem
 * sessão é quem responde por ela, e este token é emprestado. Fechar o app
 * devolve a mãe à conta dela, que é o estado em que ela deve estar por
 * padrão — e um token de criança sobrevivendo a reinício seria exatamente a
 * credencial que a T-7 existe para não criar.
 *
 * ## E o que ela pode fazer enquanto vê como a filha
 *
 * **Ler.** O servidor trata esta sessão como impersonação, e as recusas de
 * escrita que já existiam — consentimento, apagar conta, editar perfil,
 * confirmar consulta — valem sem exceção. Liberar cada escrita é uma decisão
 * por rota, a tomar de propósito, e não um poder que apareceu de graça.
 */

interface VendoComo {
  pessoa: Dependente | null;
  /** O token emprestado. Só existe em memória, e só enquanto o app está vivo. */
  token: string | null;
  erro: string | null;
  entrando: boolean;
  entrar: (pessoa: Dependente) => Promise<boolean>;
  sair: () => void;
  /** Renova o empréstimo quando o token curto expira. */
  renovar: () => Promise<boolean>;
}

async function pedirToken(id: string): Promise<string | null> {
  // Com o token **do responsável**, sempre: é ele que a rota confere contra
  // `managedById`. Pedir com o token emprestado seria aninhar sessões, e o
  // servidor recusa isso.
  const acesso = await tokenStorage.getAccess();
  if (!acesso) return null;
  try {
    const r = await fetch(`${API_URL}/api/mobile/dependents/${id}/session`, {
      method: "POST",
      headers: { Authorization: `Bearer ${acesso}` },
    });
    if (!r.ok) return null;
    const d = await r.json();
    return typeof d?.accessToken === "string" ? d.accessToken : null;
  } catch {
    return null;
  }
}

export const useVendoComo = create<VendoComo>((set, get) => ({
  pessoa: null,
  token: null,
  erro: null,
  entrando: false,

  entrar: async (pessoa) => {
    set({ entrando: true, erro: null });
    const token = await pedirToken(pessoa.id);
    if (!token) {
      set({ entrando: false, erro: "nao_foi" });
      return false;
    }
    definirTokenEmprestado(token);
    set({ pessoa, token, entrando: false, erro: null });
    return true;
  },

  sair: () => {
    definirTokenEmprestado(null);
    set({ pessoa: null, token: null, erro: null });
  },

  renovar: async () => {
    const { pessoa } = get();
    if (!pessoa) return false;
    const token = await pedirToken(pessoa.id);
    if (!token) {
      // O empréstimo acabou e não dá para renovar — o vínculo pode ter sido
      // desfeito. Voltar para a própria conta é o estado correto, e silencioso
      // é melhor que uma tela travada.
      definirTokenEmprestado(null);
      set({ pessoa: null, token: null });
      return false;
    }
    definirTokenEmprestado(token);
    set({ token });
    return true;
  },
}));

export function pessoaSendoVista(): Dependente | null {
  return useVendoComo.getState().pessoa;
}

// O cliente HTTP nao conhece este store: ele chama o modulo folha, e o
// modulo folha chama isto.
registrarRenovador(() => useVendoComo.getState().renovar());

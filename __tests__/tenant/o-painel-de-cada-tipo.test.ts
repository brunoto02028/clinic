/**
 * @jest-environment node
 */
import { lerCodigo } from "../helpers/codigo";
import { ADMIN_SECTIONS, visibleAdminSections } from "@/lib/admin-sections";
import {
  PAINEL_POR_TIPO,
  ROTA_PARA_ABA,
  abaDaRota,
  abaVisivelNoTipo,
  rotaPermitidaNoTipo,
  secaoVisivelNoTipo,
  temPainelProprio,
} from "@/lib/painel-por-tipo";

/**
 * O que o painel de cada tipo mostra (102 T-2).
 *
 * O Bruno: *"a área da Clinic deles não precisa ter todas as coisas da
 * reabilitação"*.
 */

const middleware = lerCodigo("middleware.ts");
const abas = lerCodigo("components", "admin", "section-tabs.tsx");

describe("a clínica e o estúdio não mudam", () => {
  /**
   * Um produto inteiro depende disto. A regra nova só vale para quem declara
   * painel próprio; os dois de sempre seguem pelos dois booleanos.
   */
  it("**nenhum dos dois tem painel próprio**", () => {
    expect(temPainelProprio("CLINIC")).toBe(false);
    expect(temPainelProprio("PERSONAL_TRAINER")).toBe(false);
    expect(temPainelProprio(null)).toBe(false);
  });

  it("**e o menu deles é byte a byte o de antes**", () => {
    for (const [isPersonal, tipo] of [
      [false, "CLINIC"],
      [true, "PERSONAL_TRAINER"],
    ] as const) {
      const antes = visibleAdminSections(isPersonal, "ADMIN");
      const depois = visibleAdminSections(isPersonal, "ADMIN", tipo);
      expect(depois.map((s) => s.key)).toEqual(antes.map((s) => s.key));
      for (let i = 0; i < antes.length; i++) {
        expect(depois[i].tabs.map((t) => t.key)).toEqual(antes[i].tabs.map((t) => t.key));
      }
    }
  });

  it("e toda rota passa por eles", () => {
    for (const r of ["/admin/exercises", "/admin/foot-scans", "/admin/marketing/instagram"]) {
      expect(rotaPermitidaNoTipo("CLINIC", r)).toBe(true);
      expect(rotaPermitidaNoTipo("PERSONAL_TRAINER", r)).toBe(true);
    }
  });
});

describe("o profissional declara o que vê, não o que não vê", () => {
  /**
   * Marcar o que sai daria 38 marcas por tipo, e **a que faltasse mostraria a
   * tela errada** — porque omissão, ali, quer dizer "mostra". Aqui uma seção
   * nova nasce escondida para ele: o erro barato em vez do caro.
   */
  it("**médico não tem marketing, educação nem desafios**", () => {
    for (const s of ["marketing", "education", "challenges", "notifications"]) {
      expect(secaoVisivelNoTipo("DOCTOR", s)).toBe(false);
    }
  });

  it("e tem agenda, pacientes, clínico, financeiro e configurações", () => {
    for (const s of ["agenda", "patients", "clinical", "finance", "settings"]) {
      expect(secaoVisivelNoTipo("DOCTOR", s)).toBe(true);
    }
  });

  it("**a reabilitação não entra na seção clínica dele**", () => {
    for (const aba of [
      "exercises",
      "protocols",
      "foot-scans",
      "scans",
      "body-models",
      "rehab-agent",
      "treatments",
      "biohacking",
    ]) {
      expect(abaVisivelNoTipo("DOCTOR", "clinical", aba)).toBe(false);
    }
    // O que ele usa: o que escreve, o exame, o documento.
    expect(abaVisivelNoTipo("DOCTOR", "clinical", "notes")).toBe(true);
    expect(abaVisivelNoTipo("DOCTOR", "clinical", "labs")).toBe(true);
  });

  it("**o psicólogo não recebe nem exame**", () => {
    expect(abaVisivelNoTipo("PSYCHOLOGIST", "clinical", "labs")).toBe(false);
    expect(abaVisivelNoTipo("PSYCHOLOGIST", "clinical", "notes")).toBe(true);
  });

  it("**o nutricionista ganha a seção de nutrição, e só ele**", () => {
    expect(secaoVisivelNoTipo("NUTRITIONIST", "nutrition")).toBe(true);
    expect(secaoVisivelNoTipo("DOCTOR", "nutrition")).toBe(false);
    expect(secaoVisivelNoTipo("PSYCHOLOGIST", "nutrition")).toBe(false);
  });

  it("nenhum deles tem triagem nem jornada, que são da reabilitação", () => {
    for (const tipo of ["DOCTOR", "PSYCHOLOGIST", "NUTRITIONIST", "OTHER_PROFESSIONAL"]) {
      expect(abaVisivelNoTipo(tipo, "patients", "screening")).toBe(false);
      expect(abaVisivelNoTipo(tipo, "patients", "journey")).toBe(false);
      expect(abaVisivelNoTipo(tipo, "patients", "list")).toBe(true);
    }
  });

  it("**e o menu deles não vem vazio**", () => {
    // Um painel sem seção nenhuma seria uma conta que entra e não faz nada.
    for (const tipo of Object.keys(PAINEL_POR_TIPO)) {
      const secoes = visibleAdminSections(false, "ADMIN", tipo);
      expect(secoes.length).toBeGreaterThan(2);
      for (const s of secoes) expect(s.tabs.length).toBeGreaterThan(0);
    }
  });
});

describe("as duas listas de rota não podem divergir", () => {
  /**
   * `ROTA_PARA_ABA` existe porque o middleware não pode importar
   * `admin-sections` (ícones do lucide). Duplicar dado é aceitável **quando a
   * divergência não é silenciosa** — e é este teste que a torna barulhenta.
   */
  it("**todo `href` do menu está no mapa, e na seção certa**", () => {
    const erradas: string[] = [];
    for (const s of ADMIN_SECTIONS) {
      for (const t of s.tabs) {
        const caminho = t.href.split("?")[0];
        // `/admin` puro é a raiz do painel e não pertence a aba nenhuma.
        if (caminho === "/admin") continue;
        const achou = abaDaRota(caminho);
        if (achou?.secao !== s.key) {
          erradas.push(`${caminho} → ${achou?.secao ?? "nenhuma"} (esperado ${s.key})`);
        }
      }
    }
    expect(erradas).toEqual([]);
  });

  it("e o mapa não guarda rota que o menu não tem mais", () => {
    // Uma entrada órfã aqui é um portão decidindo sobre uma tela que sumiu.
    const doMenu = new Set<string>();
    for (const s of ADMIN_SECTIONS) {
      for (const t of s.tabs) {
        for (const r of [t.href, ...(t.matchRoutes || [])]) {
          const c = r.split("?")[0];
          if (c && c !== "/admin") doMenu.add(c);
        }
      }
    }
    expect(Object.keys(ROTA_PARA_ABA).filter((r) => !doMenu.has(r))).toEqual([]);
  });

  it("a rota mais específica ganha", () => {
    // `/admin/treatment-types` não pode ser engolida por `/admin/treatments`.
    expect(abaDaRota("/admin/treatment-types")?.secao).toBe("clinical");
    expect(abaDaRota("/admin/appointments/availability")?.aba).toBe("availability");
  });

  it("e a rota de API espelha a da tela", () => {
    expect(abaDaRota("/api/admin/exercises")?.secao).toBe("clinical");
    expect(abaDaRota("/api/admin/patients/abc/documents")?.secao).toBe("patients");
  });
});

describe("o portão é no servidor, e não na barra lateral", () => {
  it("**o médico é recusado por URL no que não é dele**", () => {
    // Os caminhos são os do menu de verdade: o Instagram mora em
    // `/admin/marketing/instagram`, e a primeira versão deste teste usou
    // `/admin/instagram`, que não existe — passava por não ser de aba nenhuma.
    for (const r of [
      "/admin/exercises",
      "/admin/foot-scans",
      "/admin/marketing/instagram",
      "/admin/education",
      "/admin/protocols",
      "/admin/clinical/rehab",
    ]) {
      expect([r, rotaPermitidaNoTipo("DOCTOR", r)]).toEqual([r, false]);
    }
  });

  it("e passa no que é", () => {
    for (const r of ["/admin/appointments", "/admin/patients", "/admin/clinical-notes"]) {
      expect(rotaPermitidaNoTipo("DOCTOR", r)).toBe(true);
    }
  });

  it("**a API também**", () => {
    expect(rotaPermitidaNoTipo("DOCTOR", "/api/admin/exercises")).toBe(false);
    expect(rotaPermitidaNoTipo("DOCTOR", "/api/admin/patients")).toBe(true);
  });

  it("caminho de nenhuma seção passa", () => {
    // O portão recusa o que conhece e não é do tipo — e não tudo o que não
    // reconhece, que fecharia o painel inteiro na primeira tela nova.
    expect(rotaPermitidaNoTipo("DOCTOR", "/admin/my-account")).toBe(true);
    expect(rotaPermitidaNoTipo("DOCTOR", "/admin")).toBe(true);
  });

  it("**e o middleware usa isso, com 404 na API**", () => {
    expect(middleware).toMatch(/rotaPermitidaNoTipo\(token\.clinicType as string \| null, pathname\)/);
    expect(middleware).toMatch(/userRole !== 'SUPERADMIN' &&\s*!rotaPermitidaNoTipo/);
  });
});

describe("a barra e as abas usam a mesma regra", () => {
  it("**`section-tabs` não filtra por conta própria**", () => {
    /**
     * Ele tinha um filtro escrito com os dois booleanos — uma cópia da regra
     * da barra lateral. Duas cópias divergem, e a divergência apareceria como
     * uma aba que existe na barra e não na página.
     */
    expect(abas).toMatch(/visibleAdminSections\(isPersonal, role, clinicType\)/);
    expect(abas).not.toMatch(/isPersonal \? !tab\.clinicalOnly : !tab\.personalOnly/);
  });
});

describe("o que o code review pegou e o teste não", () => {
  /**
   * A primeira versão só listava as abas de "Clínico" e "Pacientes". As outras
   * seções vinham **inteiras**, e o painel do médico mostrava:
   *
   * - `memberships` e `marketplace` — os planos e a loja **da BPR**;
   * - `command-center`, `study`, `cpd-courses`, `my-education`, `ai-coworker` —
   *   telas internas da plataforma, que entraram no menu na triagem de 28/09.
   *
   * O teste passava porque eu tinha afirmado sobre as seções que eu lembrei.
   */
  it("**o dinheiro que ele vê é o dele**", () => {
    for (const aba of ["memberships", "marketplace", "coupons"]) {
      expect(abaVisivelNoTipo("DOCTOR", "finance", aba)).toBe(false);
    }
    expect(abaVisivelNoTipo("DOCTOR", "finance", "overview")).toBe(true);
  });

  it("**e as telas internas da BPR não são dele**", () => {
    for (const aba of [
      "command-center",
      "global-dashboard",
      "study",
      "cpd-courses",
      "my-education",
      "ai-coworker",
      "agent-keys",
      "voice-costs",
      "clinics",
      "system-logs",
    ]) {
      expect([aba, abaVisivelNoTipo("DOCTOR", "settings", aba)]).toEqual([aba, false]);
    }
    // O que sobra é o dele: a própria marca e a própria equipe.
    expect(abaVisivelNoTipo("DOCTOR", "settings", "branding")).toBe(true);
    expect(abaVisivelNoTipo("DOCTOR", "settings", "users")).toBe(true);
  });

  it("**nenhuma seção do profissional vem inteira sem lista**", () => {
    /**
     * Esta é a asserção que teria pego o achado sozinha. Toda seção que um
     * profissional externo vê precisa dizer **quais** abas — senão uma aba
     * nova nasce visível para ele, que é a omissão valendo "mostra" de novo.
     */
    for (const [tipo, painel] of Object.entries(PAINEL_POR_TIPO)) {
      for (const secao of painel!.secoes) {
        expect([tipo, secao, Array.isArray(painel!.abas?.[secao])]).toEqual([tipo, secao, true]);
      }
    }
  });
});

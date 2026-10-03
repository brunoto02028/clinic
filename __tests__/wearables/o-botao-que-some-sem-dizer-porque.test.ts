/**
 * @jest-environment node
 *
 * O botão de medir não desaparece sem dizer porquê (121 T-10).
 *
 * ## O estado real, em 03/10/2026
 *
 * A ligação do aparelho da clínica está em `ERROR` — token morto, à espera de
 * reautorização. E `clinicDevice()` só devolve ligações `CONNECTED`.
 *
 * Resultado na ficha do paciente: **nenhum botão**, nenhuma palavra. O
 * terapeuta chega ao pé do paciente com o aparelho na mão e não tem onde
 * carregar. A única leitura possível da tela é *"esta clínica não tem
 * aparelho"* — que é falso, e manda-o procurar o problema no sítio errado.
 *
 * É a mesma forma de defeito que as atividades 120 e 121 inteiras combateram,
 * agora do lado da interface: **uma falha nossa com a cara de uma ausência**.
 *
 * ## E não é só cosmético
 *
 * Sem janela de medição não há atribuição: a pressão vai para a caixa de
 * entrada ou para o dono do aparelho, e o ECG do BeamO não é atribuído a
 * paciente nenhum. O botão é a porta inteira do fluxo da clínica.
 */

const ligacaoParada: { row: any } = { row: null };
const aparelhoLigado: { row: any } = { row: null };

jest.mock("@/lib/db", () => ({
  prisma: {
    wearableConnection: { findFirst: jest.fn(async () => ligacaoParada.row) },
    clinicMeasurementSession: { findFirst: jest.fn(async () => null) },
  },
}));
jest.mock("@/lib/tenant-access", () => ({
  getSessionStaffActor: jest.fn(async () => ({ id: "staff1", clinicId: "c1" })),
}));
jest.mock("@/lib/staff-patient-access", () => ({ staffPatientAccess: jest.fn(async () => true) }));
jest.mock("@/lib/system-logger", () => ({ logAudit: jest.fn(async () => undefined) }));
jest.mock("@/lib/clinic-device", () => ({
  clinicDevice: jest.fn(async () => aparelhoLigado.row),
  expireStaleSessions: jest.fn(async () => 0),
  SESSION_WINDOW_MS: 180000,
}));
jest.mock("@/lib/withings-subscriptions", () => ({
  deliveryState: jest.fn(() => "receiving"),
  ensureCheckedSoon: jest.fn(),
}));
jest.mock("@/lib/wearable-silence", () => ({
  daysSilent: jest.fn(() => 0),
  isSilent: jest.fn(() => false),
  silenceThreshold: jest.fn(async () => 3),
}));

import { NextRequest } from "next/server";
import { GET } from "@/app/api/admin/measurement-sessions/route";
import { ler } from "../helpers/codigo";

const perguntar = () =>
  GET(new NextRequest("https://bpr.clinic/api/admin/measurement-sessions")).then((r: any) =>
    r.json()
  );

beforeEach(() => {
  ligacaoParada.row = null;
  aparelhoLigado.row = null;
});

describe("a rota distingue 'não há aparelho' de 'o aparelho parou'", () => {
  it("**ligação em `ERROR` → a rota diz que há aparelho, e que precisa reconectar**", async () => {
    ligacaoParada.row = {
      id: "clin1",
      deviceLabel: "BPM Connect",
      status: "ERROR",
      needsReauthAt: new Date("2026-09-24T10:00:00.000Z"),
    };

    const r = await perguntar();

    expect(r.device).toBeNull();
    expect(r.deviceParado).toEqual({
      label: "BPM Connect",
      status: "ERROR",
      precisaReconectar: true,
    });
  });

  it("**sem aparelho nenhum, continua a não haver nada a dizer**", async () => {
    /*
     * Uma clínica que nunca ligou um aparelho não tem problema nenhum, e um
     * aviso ali seria ruído permanente em quem não tem o que resolver.
     */
    const r = await perguntar();
    expect(r.device).toBeNull();
    expect(r.deviceParado).toBeUndefined();
  });

  it("**uma ligação desligada de propósito não vira alarme**", async () => {
    /*
     * `DISCONNECTED` é alguém a ter desligado o aparelho. Não é uma falha, e
     * por isso a consulta exclui-a.
     */
    const rota = ler("app", "api", "admin", "measurement-sessions", "route.ts");
    expect(rota).toMatch(/status: \{ not: "DISCONNECTED" \}/);
  });

  it("**e o aparelho a funcionar continua a responder como sempre**", async () => {
    aparelhoLigado.row = {
      id: "clin1",
      deviceLabel: "BPM Connect",
      notifyConfirmedAppli: [4],
      notifyCheckedAt: new Date(),
      lastReadingAt: new Date(),
      createdAt: new Date(),
      status: "CONNECTED",
    };

    const r = await perguntar();

    expect(r.device?.id).toBe("clin1");
    expect(r.deviceParado).toBeUndefined();
  });

  it("nenhum token sai na resposta", async () => {
    aparelhoLigado.row = {
      id: "clin1",
      deviceLabel: "BPM Connect",
      accessToken: "segredo-que-nao-pode-sair",
      refreshToken: "outro-segredo",
      notifyConfirmedAppli: [4],
      notifyCheckedAt: new Date(),
      lastReadingAt: new Date(),
      createdAt: new Date(),
      status: "CONNECTED",
    };

    const r = await perguntar();

    expect(JSON.stringify(r)).not.toMatch(/segredo/);
  });
});

describe("a tela diz a razão, nas duas línguas", () => {
  const tela = ler("components", "admin", "clinic-measurement-button.tsx");

  it("**o `return null` passou a ter uma excepção**", () => {
    expect(tela).toMatch(/if \(!paradoOuMorto\) return null;/);
  });

  it("**e um aparelho com a autorização morta entra pela mesma porta**", () => {
    /*
     * `status: "ERROR"` só passou a ser escrito em 03/10. Uma ligação cuja
     * cadeia de tokens morreu antes disso continua `CONNECTED`, e `clinicDevice`
     * devolve-a: a tela desenhava o botão de medir como se nada fosse. Medir
     * com ela abre uma janela que nunca recebe leitura nenhuma, e o terapeuta
     * só descobre três minutos depois, com o paciente à frente.
     */
    expect(tela).toMatch(/if \(!device \|\| device\.precisaReconectar\)/);
    expect(tela).toMatch(/device\?\.precisaReconectar \? \{ label: device\.label/);
  });

  it("**e a frase existe em inglês e em português**", () => {
    expect(tela).toMatch(
      /aparelhoPrecisaReconectar:\s*\n?\s*"The clinic device needs to be reconnected/
    );
    expect(tela).toMatch(
      /aparelhoPrecisaReconectar:\s*\n?\s*"O aparelho da clínica precisa ser reconectado/
    );
  });

  it("**com o caminho para resolver** — e para a página que de facto reconecta", () => {
    /*
     * A caixa de entrada é "o único sítio que o liga": é lá que está o botão de
     * reconectar e o texto que explica o token morto. Um link para uma página
     * que não existe seria trocar um silêncio por um 404.
     */
    expect(tela).toMatch(/href="\/admin\/measurements\/inbox"/);
  });

  it("e não diz 'diagnóstico' em lado nenhum", () => {
    expect(tela.toLowerCase()).not.toMatch(/diagn[oó]stic/);
  });
});

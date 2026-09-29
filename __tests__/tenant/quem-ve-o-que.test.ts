/**
 * @jest-environment node
 */
import fs from "fs";
import path from "path";
import { raiz, semComentarios } from "../helpers/codigo";

/**
 * A parede clínica: quem vê o quê (102 T-10).
 *
 * ## Por que esta varredura é mais larga que a da T-3
 *
 * A da T-3 olha `app/api/admin/patients/[id]/**` — as rotas que recebem o
 * paciente **na URL**. Mas o vazamento de 11/09 e os dois de 28/09 tinham outra
 * forma: `patientId` vindo do **corpo** ou da **query**, numa rota cujo caminho
 * não fala de paciente nenhum. `?clinicId=` foi assim, e `?patientId=` é a
 * mesma porta com outro nome.
 *
 * Então esta varre `app/api` inteiro e pergunta de toda rota que menciona
 * `patientId`: ou ela passa por um guarda, ou filtra por `clinicId`, ou está
 * aqui embaixo **com o motivo lido no código**.
 *
 * ## O que ela já pegou
 *
 * Duas rotas anteriores à 102, ambas fechadas em 29/09/2026:
 *
 * - `admin/rehab-plans/recent` — `findMany` sem filtro nenhum, com o
 *   `chiefComplaint` e o nome do paciente. Qualquer terapeuta de qualquer
 *   clínica lia a queixa principal dos últimos vinte planos da plataforma.
 * - `admin/clinical-scribe/recordings` — `?patientId=` montava o `where` direto,
 *   e o `PATCH` atualizava por `{ id }` sozinho.
 *
 * ## O que ela não é
 *
 * Ler código como texto não prova comportamento — a matriz adversária medida
 * está em `qa/report-t-10.md`. Esta é a rede que impede a rota **nova** de
 * nascer aberta.
 */

const API = path.join(raiz, "app", "api");

/**
 * Os nomes que guardam, descobertos seguindo a cadeia — a mesma técnica da
 * varredura da T-3, e pela mesma razão: uma lista escrita à mão não enxerga
 * indireção e inventa achado a cada camada nova.
 */
function nomesQueGuardam(): Set<string> {
  const base = new Set([
    "assertPatientAccess",
    "canAccessRecord",
    "patientGate",
    // Quem cruza inquilino por desenho: o próprio superadmin.
    "getSuperadminActor",
  ]);
  const arquivos: string[] = [];
  const andar = (d: string) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) andar(p);
      else if (/\.ts$/.test(e.name)) arquivos.push(semComentarios(fs.readFileSync(p, "utf8")));
    }
  };
  andar(path.join(raiz, "lib"));

  for (let i = 0; i < 3; i++) {
    for (const codigo of arquivos) {
      for (const m of codigo.matchAll(/export (?:async )?function (\w+)/g)) {
        const nome = m[1];
        if (base.has(nome)) continue;
        const i0 = codigo.indexOf(m[0]);
        const i1 = codigo.indexOf("\nexport ", i0 + 1);
        const corpo = codigo.slice(i0, i1 === -1 ? undefined : i1);
        if ([...base].some((g) => corpo.includes(g))) base.add(nome);
      }
    }
  }
  return base;
}

/**
 * As rotas que mencionam `patientId` e **não** passam por guarda nem filtram por
 * inquilino — cada uma com o motivo, lido no arquivo.
 *
 * Isto não é perdão: é o retrato. Uma entrada nova aqui exige ler a rota e
 * escrever por que ela não precisa da parede — e "não precisa" tem três formas
 * legítimas, e só três: **o dono é quem pergunta**, **a credencial é o próprio
 * pedido**, ou **não há dado de paciente na resposta**.
 */
const FORA_DA_PAREDE: Record<string, string> = {
  // 1. O dono é quem pergunta: o `patientId` da consulta é o do próprio usuário.
  "biohacking/my-protocol/route.ts": "getEffectiveUser: where.patientId é o próprio userId",
  "dashboard/evolution/route.ts": "sessão: where.patientId é o id da sessão",
  "dashboard/stats/route.ts": "getEffectiveUser: where.patientId é o próprio userId",
  "patient/lab-consent/route.ts": "getEffectiveUser, e `sujeito()` resolve a criança da conta",
  "appointments/[id]/video/call/route.ts":
    "participante: recusa quem não é o terapeuta daquela consulta",

  // 2. A credencial é o próprio pedido — não há sessão para conferir.
  "intake/[token]/route.ts": "o token de intake É a credencial; a rota é pública por desenho",
  "patient/invoices/[id]/pdf/route.ts": "verifyFileToken: link assinado, prefixo `invoice:`",
  "webhooks/whatsapp/route.ts": "verifyWebhookSignature: x-hub-signature-256",
  "cron/appointment-reminders/route.ts": "CRON_SECRET; e os lembretes estão desligados desde 17/09",
  "cron/bp-reminders/route.ts": "CRON_SECRET",
  "cron/exercise-reminders/route.ts": "CRON_SECRET",

  // 3. Não há dado de paciente na resposta.
  "admin/appointments/generate-notes/route.ts":
    "o patientId só vira pseudônimo no prompt; nenhuma linha é lida do banco",
};

describe("toda rota que toca `patientId` tem parede", () => {
  const guardas = nomesQueGuardam();

  const rotas: { nome: string; codigo: string }[] = [];
  const andar = (d: string) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) andar(p);
      else if (e.name === "route.ts") {
        rotas.push({
          nome: path.relative(API, p).split(path.sep).join("/"),
          codigo: semComentarios(fs.readFileSync(p, "utf8")),
        });
      }
    }
  };
  andar(API);

  const tocamPaciente = rotas.filter((r) => /patientId/.test(r.codigo));
  const semParede = tocamPaciente
    .filter(
      (r) =>
        ![...guardas].some((g) => r.codigo.includes(g)) &&
        // Filtrar por `clinicId` na própria consulta também é parede.
        !/clinicId/.test(r.codigo)
    )
    .map((r) => r.nome)
    .sort();

  it("a varredura enxerga a API inteira", () => {
    // Uma varredura que não acha nada passa sempre — e foi assim que uma
    // varredura minha mentiu por um mês.
    expect(rotas.length).toBeGreaterThan(300);
    expect(tocamPaciente.length).toBeGreaterThan(150);
  });

  it("**e enxerga a cadeia, não só o nome direto**", () => {
    for (const g of ["staffPatientAccess", "guardEmailAccess", "patientRecordAccess"]) {
      expect(guardas.has(g)).toBe(true);
    }
  });

  it("**nenhuma rota nova sem parede**", () => {
    /**
     * Quando falhar: a rota nova usa o guarda, ou filtra por `clinicId`, ou
     * entra em `FORA_DA_PAREDE` com o motivo **lido no arquivo** — e o motivo
     * tem de ser uma das três formas legítimas.
     */
    const novas = semParede.filter((r) => !(r in FORA_DA_PAREDE));
    expect(novas).toEqual([]);
  });

  it("e a lista não guarda o que já foi fechado", () => {
    // Uma exceção que sobrevive ao conserto vira permissão permanente.
    const resolvidas = Object.keys(FORA_DA_PAREDE).filter((r) => !semParede.includes(r));
    expect(resolvidas).toEqual([]);
  });

  it("**e as duas que ela pegou continuam fechadas**", () => {
    /**
     * A asserção nomeia o defeito, e não só a correção: `findMany` sem filtro e
     * `update` por id sozinho são as duas formas que vazaram.
     */
    const planos = semComentarios(
      fs.readFileSync(path.join(API, "admin", "rehab-plans", "recent", "route.ts"), "utf8")
    );
    expect(planos).toMatch(/where: \{ patient: \{ clinicId: actor\.clinicId \} \}/);

    const gravacoes = semComentarios(
      fs.readFileSync(path.join(API, "admin", "clinical-scribe", "recordings", "route.ts"), "utf8")
    );
    expect(gravacoes).toMatch(/OR: \[\{ clinicId: actor\.clinicId \}, \{ clinicId: null \}\]/);
    // O PATCH confere antes de escrever, e responde 404 — não 403.
    expect(gravacoes).toMatch(/if \(!daMinhaCasa\) \{/);
    expect(gravacoes).toMatch(/error: "Recording not found" \}, \{ status: 404 \}/);
  });
});

/**
 * A tabela de quem-vê-o-quê, como asserção.
 *
 * A T-10 pede a tabela no relatório de QA — e ela está lá, medida. Aqui fica a
 * parte dela que o código sustenta, para que mudar o código sem mudar a tabela
 * quebre o teste em vez de quebrar a promessa.
 */
describe("a tabela de quem vê o quê", () => {
  const guarda = semComentarios(
    fs.readFileSync(path.join(raiz, "lib", "staff-patient-access.ts"), "utf8")
  );
  const share = semComentarios(fs.readFileSync(path.join(raiz, "lib", "care-share.ts"), "utf8"));

  it("**o inquilino do paciente vê tudo o que é dele — e é a linha de base**", () => {
    // `clinicId` igual continua sendo a resposta larga: a 102 não mexeu nisso.
    const acesso = semComentarios(
      fs.readFileSync(path.join(raiz, "lib", "tenant-access.ts"), "utf8")
    );
    expect(acesso).toMatch(
      /if \(patient\.clinicId === actor\.clinicId\) \{\s*return \{ id: patient\.id, clinicId: patient\.clinicId \};/
    );
  });

  it("**o profissional com vínculo vê identidade + o que lhe partilharam, e nada mais**", () => {
    expect(guarda).toMatch(/if \(alcance\.porVinculo && !opcoes\?\.porVinculo\)/);
    expect(share).toMatch(/porPartilha: true,/);
  });

  it("**o profissional sem vínculo não vê que a pessoa existe**", () => {
    // 404, e a mesma frase de "não existe".
    const acesso = semComentarios(
      fs.readFileSync(path.join(raiz, "lib", "tenant-access.ts"), "utf8")
    );
    expect(acesso).toMatch(/throw new AccessError\(404, "Not found"\);/);
  });

  it("**e o paciente vê quem tem acesso e desde quando, sem módulo que desligue**", () => {
    const links = semComentarios(
      fs.readFileSync(path.join(raiz, "app", "api", "patient", "care-links", "route.ts"), "utf8")
    );
    const shares = semComentarios(
      fs.readFileSync(path.join(raiz, "app", "api", "patient", "care-shares", "route.ts"), "utf8")
    );
    for (const r of [links, shares]) {
      expect(r).toMatch(/patientGate\(\)/);
      expect(r).not.toMatch(/patientGate\(\{ module/);
    }
  });
});

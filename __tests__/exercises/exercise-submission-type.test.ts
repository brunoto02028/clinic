/**
 * @jest-environment node
 *
 * O tipo do arquivo tem que vir dos bytes.
 *
 * `file.type` é o que o cliente **declarou** no multipart. Um `.exe` renomeado
 * para `.mp4` declarava `video/mp4`, passava pela recusa e era guardado como
 * vídeo de paciente — servido depois com `Content-Type: video/mp4` para quem
 * abrisse (QA local da 076, F1).
 */

import { sniffSubmissionType, refuseSubmission, kindOf, MAX_DURATION_SECONDS } from "@/lib/exercise-submission";

const ftyp = (marca: string) =>
  Buffer.concat([
    Buffer.from([0, 0, 0, 0x20]),
    Buffer.from("ftyp", "latin1"),
    Buffer.from(marca, "latin1"),
    Buffer.alloc(16),
  ]);

describe("sniffSubmissionType", () => {
  it("reconhece MP4, MOV e HEIC pela marca da caixa ISO-BMFF", () => {
    expect(sniffSubmissionType(ftyp("isom"))).toBe("video/mp4");
    expect(sniffSubmissionType(ftyp("mp42"))).toBe("video/mp4");
    expect(sniffSubmissionType(ftyp("qt  "))).toBe("video/quicktime");
    expect(sniffSubmissionType(ftyp("heic"))).toBe("image/heic");
    expect(sniffSubmissionType(ftyp("mif1"))).toBe("image/heic");
  });

  it("reconhece JPEG e PNG", () => {
    expect(sniffSubmissionType(Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(16)]))).toBe("image/jpeg");
    expect(
      sniffSubmissionType(Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(16)]))
    ).toBe("image/png");
  });

  it("recusa um executável renomeado para .mp4", () => {
    const exe = Buffer.concat([Buffer.from("MZ\x90\x00", "latin1"), Buffer.from("This program cannot be run in DOS mode.")]);
    expect(sniffSubmissionType(exe)).toBeNull();
  });

  it("não adivinha: arquivo curto demais ou irreconhecível é null, não 'talvez'", () => {
    expect(sniffSubmissionType(Buffer.from("abc"))).toBeNull();
    expect(sniffSubmissionType(Buffer.alloc(64))).toBeNull();
  });
});

describe("refuseSubmission", () => {
  it("aceita os tipos que a clínica consegue abrir", () => {
    expect(refuseSubmission({ type: "video/mp4", size: 1000 }, 30)).toBeNull();
    expect(refuseSubmission({ type: "image/jpeg", size: 1000 })).toBeNull();
  });

  it("recusa por duração antes de por tamanho — o esforço perdido é o do paciente", () => {
    const r = refuseSubmission({ type: "video/mp4", size: 900 * 1024 * 1024 }, MAX_DURATION_SECONDS + 5);
    expect(r?.code).toBe("too_long");
  });

  it("recusa um tipo que não serve", () => {
    expect(refuseSubmission({ type: "application/x-msdownload", size: 10 })?.code).toBe("unsupported_type");
  });
});

describe("kindOf", () => {
  it("separa vídeo de foto", () => {
    expect(kindOf("video/quicktime")).toBe("VIDEO");
    expect(kindOf("image/heic")).toBe("PHOTO");
  });
});

describe("sniffSubmissionType — PDF (achado A7)", () => {
  it("reconhece PDF pelo cabeçalho", () => {
    const pdf = Buffer.concat([Buffer.from("%PDF-1.4\n1 0 obj", "latin1"), Buffer.alloc(16)]);
    expect(sniffSubmissionType(pdf)).toBe("application/pdf");
  });

  it("um executável renomeado para .pdf não vira PDF", () => {
    const exe = Buffer.concat([Buffer.from("MZ\x90\x00", "latin1"), Buffer.alloc(32)]);
    expect(sniffSubmissionType(exe)).toBeNull();
  });
});

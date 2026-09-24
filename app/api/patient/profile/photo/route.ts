export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getEffectiveUser } from '@/lib/get-effective-user';
import { patientGate } from '@/lib/patient-gate';
import { patientOnlyWriteRefusal } from '@/lib/patient-only-write';
import { MAX_THUMBNAIL_BYTES } from '@/lib/exercise-media';
import { rateLimit } from '@/lib/rate-limit';
import { isR2Configured, uploadToR2, deleteR2Url, deleteFromR2, r2PublicUrl } from '@/lib/r2';

/**
 * A foto de perfil do paciente.
 *
 * O avatar era as iniciais do nome, desenhadas — não havia foto em lugar
 * nenhum do app, e as colunas `profileImageUrl`/`profileImagePath` existiam
 * preenchidas só pelo cadastro via Google.
 *
 * Reusa o pipeline do R2 e os limites que já valem para as miniaturas de
 * exercício: mesmos tipos, mesmo teto de 5 MB. Um segundo jeito de guardar
 * arquivo seria um segundo jeito de vazar.
 */

/**
 * Os tipos aceitos, e a extensão de cada um.
 *
 * Esta é a fonte da verdade dos dois, de propósito: antes a lista de aceitos
 * vinha de `ALLOWED_THUMBNAIL_TYPES` e as extensões daqui, e bastava alguém
 * acrescentar `image/gif` lá para a chave virar `….undefined`. A extensão sai
 * do MIME, nunca do nome do arquivo que o cliente mandou — é o que impede um
 * nome como `../../algo` de virar caminho.
 */
const EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

/**
 * Esta é a foto **do paciente**, e só ele a troca.
 *
 * O gate compartilhado deixa passar quem não é paciente de propósito: rotas
 * que o admin e o portal dividem (a triagem, por exemplo) quebrariam se ele
 * recusasse, porque a autorização da equipe é outra e já rodou antes. Aqui não
 * há rota compartilhada nenhuma — é o perfil do paciente —, então a decisão
 * fica explícita em vez de herdada.
 *
 * Impersonação também não escreve, como em toda escrita que pertence ao
 * paciente: um admin vendo o portal não troca a foto de ninguém.
 */
function refusePatientOnly(gate: { role?: string | null; isImpersonating?: boolean }) {
  const reason = patientOnlyWriteRefusal(gate);
  if (reason === 'impersonation') {
    return NextResponse.json(
      { error: 'Read-only during impersonation', errorPt: 'Somente leitura durante a visualização' },
      { status: 403 }
    );
  }
  if (reason === 'not_patient') {
    return NextResponse.json(
      {
        error: 'This is the patient profile photo.',
        errorPt: 'Esta é a foto de perfil do paciente.',
        code: 'patient_only',
      },
      { status: 403 }
    );
  }
  return null;
}

export async function POST(req: NextRequest) {
  // A foto é gestão da própria conta, como o resto do perfil — não depende do
  // consentimento clínico, que trava dado de tratamento.
  const gate = await patientGate({ skipConsent: true });
  if (gate.response) return gate.response;
  const refused = refusePatientOnly(gate.gate);
  if (refused) return refused;

  try {
    // O gate já resolveu quem é: chamar `getEffectiveUser()` de novo repetiria
    // a sessão e, em impersonação, mais duas queries.
    const userId = gate.gate.userId;

    // Uma foto por vez, e não vinte. Sem isto uma conta de paciente pode
    // empurrar corpos de 5 MB em sequência e consumir a memória do container,
    // porque o `formData()` materializa tudo antes de qualquer checagem.
    const limite = rateLimit(`profile-photo:${userId}`, { max: 10, windowMs: 60 * 60_000 });
    if (!limite.allowed) {
      return NextResponse.json(
        {
          error: 'Too many photo changes. Try again later.',
          errorPt: 'Muitas trocas de foto. Tente de novo mais tarde.',
          code: 'rate_limited',
        },
        { status: 429 }
      );
    }

    // O tamanho é conferido antes de ler o corpo — depois já custou a memória.
    // O limite aqui é frouxo de propósito: `content-length` inclui o envelope
    // do multipart, e a checagem exata vem logo abaixo.
    const declared = Number(req.headers.get('content-length') ?? 0);
    if (declared > MAX_THUMBNAIL_BYTES * 1.2) {
      return NextResponse.json(
        { error: 'Image is too large (max 5 MB)', code: 'too_large' },
        { status: 400 }
      );
    }

    if (!isR2Configured()) {
      return NextResponse.json(
        { error: 'File storage is not configured', code: 'storage_unconfigured' },
        { status: 503 }
      );
    }

    // O `formData()` lança quando o corpo não é multipart, e dentro do try
    // genérico isso virava 500 — um pedido malformado é 400, não falha nossa.
    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      return NextResponse.json(
        { error: 'Send the image as multipart/form-data', code: 'bad_request' },
        { status: 400 }
      );
    }

    const file = form.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'No file sent' }, { status: 400 });

    const type = file.type?.toLowerCase() ?? '';
    if (!EXT[type]) {
      return NextResponse.json(
        { error: 'Send a JPEG, PNG or WebP image', code: 'unsupported_type' },
        { status: 400 }
      );
    }
    if (file.size > MAX_THUMBNAIL_BYTES) {
      return NextResponse.json(
        { error: 'Image is too large (max 5 MB)', code: 'too_large' },
        { status: 400 }
      );
    }

    const previous = await prisma.user.findUnique({
      where: { id: userId },
      select: { profileImageUrl: true } as any,
    });

    // O timestamp no nome é o que faz a troca aparecer: sem ele o caminho
    // seria sempre o mesmo e o cache do aparelho seguiria mostrando a foto
    // antiga depois de trocada.
    const key = `profile-photos/${userId}/${Date.now()}.${EXT[type]}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    await uploadToR2(key, buffer, type);
    const url = r2PublicUrl(key);

    try {
      await prisma.user.update({
        where: { id: userId },
        data: { profileImageUrl: url, profileImagePath: key } as any,
      });
    } catch (err) {
      // O arquivo subiu e o banco não registrou: sem isto ficaria um objeto
      // que ninguém referencia e ninguém apaga.
      await deleteFromR2(key).catch(() => {});
      throw err;
    }

    // A antiga sai depois que a nova está gravada: se a remoção falhar, o
    // paciente fica com a foto nova e um objeto órfão, e não sem foto nenhuma.
    await deleteR2Url((previous as any)?.profileImageUrl).catch(() => {});

    return NextResponse.json({ profileImageUrl: url });
  } catch (err) {
    console.error('[patient-profile-photo] POST error:', err);
    return NextResponse.json({ error: 'Failed to save photo' }, { status: 500 });
  }
}

export async function DELETE() {
  const gate = await patientGate({ skipConsent: true });
  if (gate.response) return gate.response;
  const refused = refusePatientOnly(gate.gate);
  if (refused) return refused;

  try {
    const userId = gate.gate.userId;
    const current = await prisma.user.findUnique({
      where: { id: userId },
      select: { profileImageUrl: true } as any,
    });

    await prisma.user.update({
      where: { id: userId },
      data: { profileImageUrl: null, profileImagePath: null } as any,
    });
    await deleteR2Url((current as any)?.profileImageUrl).catch(() => {});

    return NextResponse.json({ profileImageUrl: null });
  } catch (err) {
    console.error('[patient-profile-photo] DELETE error:', err);
    return NextResponse.json({ error: 'Failed to remove photo' }, { status: 500 });
  }
}

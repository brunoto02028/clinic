export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { getEffectiveUser } from '@/lib/get-effective-user';
import { patientGate } from "@/lib/patient-gate";
import { normalizarPostcode } from "@/lib/postcode";

// GET — patient profile
export async function GET() {
  // Consentimento e plano valem no servidor, não só na tela (auditoria de paridade, 24/09/2026).
  const __gate = await patientGate({ skipConsent: true });
  if (__gate.response) return __gate.response;

  try {
    const effectiveUser = await getEffectiveUser();
    if (!effectiveUser) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

    const userId = effectiveUser.userId;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, firstName: true, lastName: true, email: true,
        phone: true, dateOfBirth: true, address: true, sex: true,
        // `city` e `postcode` já existiam na tabela e nunca saíam daqui, então
        // a tela não tinha como mostrar o que a pessoa cadastrou. O código
        // postal é o que acha ponto de coleta perto dela (081).
        city: true, postcode: true,
        preferredLocale: true, communicationPreference: true, pushEnabled: true,
        emergencyContactName: true, emergencyContactPhone: true, emergencyContactRelation: true,
        profileImageUrl: true,
      } as any,
    });

    return NextResponse.json({ user });
  } catch (err) {
    console.error('[patient-profile] GET error:', err);
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
}

// PATCH — update patient profile fields
export async function PATCH(req: NextRequest) {
  // Consentimento e plano valem no servidor, não só na tela (auditoria de paridade, 24/09/2026).
  const __gate = await patientGate({ skipConsent: true });
  if (__gate.response) return __gate.response;

  try {
    const effectiveUser = await getEffectiveUser();
    if (!effectiveUser) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

    // Block writes during impersonation (read-only)
    if (effectiveUser.isImpersonating) {
      return NextResponse.json({ error: 'Cannot modify profile while impersonating' }, { status: 403 });
    }

    const userId = effectiveUser.userId;
    const body = await req.json();

    // `firstName`/`lastName` are here now. They were excluded, which made the
    // app's name inputs a trap: they accepted typing and the change vanished on
    // Save, with no error, because the field never reached this list. A patient
    // correcting a misspelt surname is doing ordinary self-service, not
    // something that needs the clinic on the phone.
    // `pushEnabled`: a chave que o paciente tem para dizer "chega" sem
    // precisar desinstalar o app (077, T-7).
    const allowedFields = ['firstName', 'lastName', 'phone', 'address', 'city', 'postcode', 'preferredLocale', 'communicationPreference', 'pushEnabled', 'dateOfBirth', 'sex', 'emergencyContactName', 'emergencyContactPhone', 'emergencyContactRelation'];
    const data: Record<string, any> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) data[field] = body[field];
    }

    // A blank name is never an edit worth saving: it is what an empty input
    // sends, and it would leave the patient nameless on every staff screen,
    // every letter and every appointment card. Trim and refuse the empty.
    for (const field of ['firstName', 'lastName'] as const) {
      if (data[field] === undefined) continue;
      // `String(...)` alone turned `{"lastName":{"a":1}}` into the literal
      // "[object Object]" and stored it. Anything that is not a string is a
      // malformed request, not a name.
      if (typeof data[field] !== 'string') {
        return NextResponse.json({ error: `${field} must be text` }, { status: 400 });
      }
      const trimmed = String(data[field] ?? '').trim();
      if (!trimmed) {
        return NextResponse.json(
          { error: field === 'firstName' ? 'First name cannot be empty' : 'Last name cannot be empty' },
          { status: 400 }
        );
      }
      data[field] = trimmed.slice(0, 100);
    }

    // O código postal é guardado normalizado — "sw1a1aa" e "SW1A 1AA" são o
    // mesmo lugar, e só uma das duas formas acha ponto de coleta. Forma errada
    // é recusada aqui, e não descoberta depois na busca.
    if (typeof data.postcode === 'string') {
      const limpo = data.postcode.trim();
      if (limpo) {
        const normal = normalizarPostcode(limpo);
        if (!normal) {
          return NextResponse.json({ error: 'That does not look like a UK postcode' }, { status: 400 });
        }
        data.postcode = normal;
      } else {
        data.postcode = null;
      }
    }

    if (typeof data.city === 'string') {
      data.city = data.city.trim().slice(0, 80) || null;
    }

    // Convert dateOfBirth string to DateTime
    if (data.dateOfBirth && typeof data.dateOfBirth === 'string') {
      data.dateOfBirth = new Date(data.dateOfBirth);
    } else if (data.dateOfBirth === null) {
      data.dateOfBirth = null;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const user = await (prisma as any).user.update({
      where: { id: userId },
      data,
      select: { id: true, firstName: true, lastName: true, email: true, phone: true, preferredLocale: true, city: true, postcode: true },
    });

    return NextResponse.json({ success: true, user });
  } catch (err) {
    console.error('[patient-profile] PATCH error:', err);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}

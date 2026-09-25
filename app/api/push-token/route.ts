import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getEffectiveUser } from "@/lib/get-effective-user";
import { isExpoPushToken } from "@/lib/push-send";

export const dynamic = "force-dynamic";

/**
 * Onde um aparelho passa a existir para as notificações.
 *
 * Esta rota já estava aqui e **não servia para o app**: resolvia só cookie de
 * navegador, e `/api/push-token` nem estava na lista de prefixos que o
 * middleware deixa passar com bearer — o app tomava 307 para `/login` e
 * nenhum aparelho jamais foi registrado.
 *
 * `getEffectiveUser` resolve os dois: o cookie da web e o bearer do celular.
 */

// POST — registra ou reativa o aparelho de quem está chamando.
export async function POST(req: NextRequest) {
  const eff = await getEffectiveUser();
  if (!eff) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let corpo: any;
  try {
    corpo = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body", code: "bad_request" }, { status: 400 });
  }

  const token = String(corpo?.token || "").trim();
  const platform = String(corpo?.platform || "").trim().toLowerCase();

  if (!token || !platform) {
    return NextResponse.json({ error: "token and platform required" }, { status: 400 });
  }
  // O token é sempre o de quem está autenticado. Nunca vem um `userId` do
  // corpo: seria oferecer o aparelho de outra pessoa como destino.
  if (!isExpoPushToken(token)) {
    return NextResponse.json(
      { error: "Not an Expo push token", code: "bad_token" },
      { status: 400 }
    );
  }
  if (!["ios", "android", "web"].includes(platform)) {
    return NextResponse.json({ error: "Unknown platform", code: "bad_platform" }, { status: 400 });
  }

  await (prisma as any).pushDeviceToken.upsert({
    where: { userId_token: { userId: eff.userId, token } },
    update: { active: true, platform, updatedAt: new Date() },
    create: { userId: eff.userId, token, platform, active: true },
  });

  return NextResponse.json({ success: true });
}

// DELETE — o aparelho sai de circulação no logout.
export async function DELETE(req: NextRequest) {
  const eff = await getEffectiveUser();
  if (!eff) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let token = "";
  try {
    token = String((await req.json())?.token || "").trim();
  } catch {
    // Corpo ausente ou quebrado: desativa todos os aparelhos desta conta, que
    // é o que "sair" quer dizer quando não se sabe de qual aparelho se fala.
  }

  await (prisma as any).pushDeviceToken.updateMany({
    where: { userId: eff.userId, ...(token ? { token } : {}) },
    data: { active: false },
  });

  return NextResponse.json({ success: true });
}

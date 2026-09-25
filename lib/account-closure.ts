import { prisma } from "@/lib/db";
import { revokeAllForUser } from "@/lib/mobile-tokens";
import { logAudit } from "@/lib/system-logger";

/**
 * Closing a patient's account.
 *
 * Apple requires it of any app that lets someone create an account (guideline
 * 5.1.1(v)), and it has to happen inside the app — not by e-mail, not by
 * asking the clinic. That is what brings this into existence. But "delete
 * everything" is not available to us: the consent the patient accepted says
 * their record is kept "at least 5 years after your last treatment", and a
 * clinic is obliged to keep it. Promising erasure and then keeping the notes
 * would be the worse of the two lies.
 *
 * So the account ends and the person stops being named. Access is revoked,
 * every identifier and every way to contact them is erased, and the clinical
 * record stays attached to a row that no longer says who they were.
 *
 * The honest word for that is **pseudonymisation**, not anonymisation: a
 * clinical history is about a person, and enough of it could in principle
 * point back at one. Calling it anonymous in a comment would be the kind of
 * claim that outlives whoever wrote it. What is true is narrower and worth
 * stating plainly: nothing in this row identifies or reaches them any more.
 *
 * Staff accounts do not go through here. They are not self-service, they have
 * clinical authorship attached, and an admin closing their own account this
 * way would be a different decision with different consequences.
 */

/** What the record says in place of a name, once there is no name to say. */
const CLOSED_FIRST_NAME = "Removed";
const CLOSED_LAST_NAME = "account";

export class AccountClosureError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export interface CloseAccountInput {
  userId: string;
  /** For the consent log — this is a request about their own data. */
  ipAddress?: string | null;
  userAgent?: string | null;
}

export async function closePatientAccount(input: CloseAccountInput): Promise<{ closedAt: Date }> {
  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { id: true, role: true, email: true, clinicId: true },
  });
  if (!user) throw new AccountClosureError("Not found", 404);
  if (user.role !== "PATIENT") {
    throw new AccountClosureError("Only a patient account can be closed from here", 403);
  }

  const closedAt = new Date();
  // The e-mail column is unique, so it cannot simply be emptied. The id is
  // already the key and is not derived from anything about the person, so it
  // carries no information a stranger could read — and `.invalid` is reserved
  // by RFC 2606 precisely so that nothing will ever try to deliver to it.
  const closedEmail = `closed-${user.id}@removed.invalid`;

  await prisma.$transaction(async (tx) => {
    // Written first, and inside the transaction: if the erasure fails there
    // must be no record claiming it happened, and if it succeeds there must be
    // a record that it was asked for. The row survives because the account
    // row survives — the log cascades from it.
    await (tx as any).consentLog.create({
      data: {
        patientId: user.id,
        action: "DATA_DELETION_REQUEST",
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
        metadata: {
          closedAt: closedAt.toISOString(),
          // Deliberately not the old address: this log is the one thing that
          // outlives the erasure, and writing the e-mail into it would undo it.
          identifiersErased: true,
          clinicalRecordRetained: true,
        },
      },
    });

    await (tx as any).user.update({
      where: { id: user.id },
      data: {
        email: closedEmail,
        firstName: CLOSED_FIRST_NAME,
        lastName: CLOSED_LAST_NAME,
        // No password means no way back in even if the address were reused.
        password: null,
        emailVerified: null,
        isActive: false,
        phone: null,
        dateOfBirth: null,
        address: null,
        emergencyContactName: null,
        emergencyContactPhone: null,
        emergencyContactRelation: null,
        profileImageUrl: null,
        profileImagePath: null,
        telegramChatId: null,
        intakeToken: null,
        intakeTokenExpiry: null,
        // Reminders are addressed to a person. There is no longer one.
        bpReminderEnabled: false,
      },
    });
  });

  // Outside the transaction on purpose: a token store that is momentarily
  // unavailable must not roll back an erasure the patient asked for. The
  // account is already inactive and password-less, so a surviving token buys
  // nothing — and the next refresh fails anyway.
  await revokeAllForUser(user.id).catch((e) =>
    console.error("[account-closure] token revocation failed:", e?.message)
  );

  await logAudit({
    userId: user.id,
    userEmail: "",
    userRole: "PATIENT",
    action: "ACCOUNT_CLOSED",
    entity: "User",
    entityId: user.id,
    description: "Patient closed their own account; identifiers erased, clinical record retained",
    metadata: { clinicId: user.clinicId, closedAt: closedAt.toISOString() },
  });

  return { closedAt };
}

import { Prisma } from "@prisma/client";

// A whitelist of scalar/enum columns per model, derived from Prisma's own
// metadata. Removing named ownership keys was not enough: an edit body could
// still carry a relation write (`{ patient: { connect: … } }` to move a record
// to another tenant, or `{ uploadedBy: { update: { role: "SUPERADMIN" } } }` to
// promote its author). Prisma routes a key to a relation or a foreign key by
// the key's name, so the only safe filter is by name too — and the model
// metadata already marks which names are relations (`kind === "object"`),
// foreign keys (`isReadOnly`), the id, and the timestamps.

const editableByModel = new Map<string, Set<string>>();

function editableFields(model: string): Set<string> {
  let set = editableByModel.get(model);
  if (!set) {
    const meta = Prisma.dmmf.datamodel.models.find((m) => m.name === model);
    if (!meta) throw new Error(`[tenant-field-guard] unknown model "${model}"`);
    set = new Set(
      meta.fields
        .filter(
          (f) =>
            f.kind !== "object" && // relations — no nested connect/update
            !f.isReadOnly && // foreign keys (patientId, clinicId, …)
            !f.isId &&
            !f.isUpdatedAt &&
            f.name !== "createdAt"
        )
        .map((f) => f.name)
    );
    editableByModel.set(model, set);
  }
  return set;
}

/** Keep only the model's own editable columns from a free-form edit body. */
export function pickEditable(
  model: string,
  body: Record<string, unknown>
): Record<string, unknown> {
  const allowed = editableFields(model);
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if (allowed.has(key)) out[key] = value;
  }
  return out;
}

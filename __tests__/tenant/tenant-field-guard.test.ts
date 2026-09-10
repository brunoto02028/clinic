/**
 * @jest-environment node
 *
 * Free-form edit actions (edit_document, edit_screening, …) passed the request
 * body straight to Prisma. Stripping named ownership keys was not enough: a
 * body could carry a relation write — `{ patient: { connect } }` to move a
 * record to another tenant, or `{ uploadedBy: { update: { role } } }` to
 * promote its author to SUPERADMIN. pickEditable keeps only each model's own
 * scalar columns, so no relation or foreign key survives.
 */

import { pickEditable } from "@/lib/tenant-field-guard";

describe("pickEditable", () => {
  it("keeps ordinary scalar fields", () => {
    expect(pickEditable("PatientDocument", { title: "Report", description: "x" })).toEqual({
      title: "Report",
      description: "x",
    });
  });

  it("drops the id, foreign keys and timestamps", () => {
    const kept = pickEditable("PatientDocument", {
      id: "d1",
      patientId: "patientOfB",
      clinicId: "clinicB",
      uploadedById: "someone",
      createdAt: new Date(),
      title: "kept",
    });
    expect(kept).toEqual({ title: "kept" });
  });

  it("drops relation writes — no cross-tenant move via connect", () => {
    const kept = pickEditable("PatientDocument", {
      patient: { connect: { id: "patientOfB" } },
      clinic: { connect: { id: "clinicB" } },
      title: "kept",
    });
    expect(kept).toEqual({ title: "kept" });
  });

  it("drops a nested relation update — no privilege escalation via uploadedBy", () => {
    const kept = pickEditable("PatientDocument", {
      uploadedBy: { update: { role: "SUPERADMIN" } },
      title: "kept",
    });
    expect(kept).toEqual({ title: "kept" });
    expect("uploadedBy" in kept).toBe(false);
  });

  it("drops the parent link of a protocol item", () => {
    const kept = pickEditable("ProtocolItem", {
      protocolId: "protocolOfB",
      protocol: { connect: { id: "protocolOfB" } },
      title: "kept",
      sets: 3,
    });
    expect(kept).toEqual({ title: "kept", sets: 3 });
  });

  it("keeps a screening's clinical answers while dropping its owner", () => {
    const kept = pickEditable("MedicalScreening", {
      userId: "alunoB",
      clinicId: "clinicB",
      chiefComplaint: "knee pain",
      nightPain: true,
    });
    expect(kept).toEqual({ chiefComplaint: "knee pain", nightPain: true });
  });

  it("throws on an unknown model rather than passing everything through", () => {
    expect(() => pickEditable("NotAModel", { x: 1 })).toThrow(/unknown model/);
  });
});

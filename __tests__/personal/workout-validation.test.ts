import {
  validateExerciseInput,
  validateExercises,
  type WorkoutExerciseInput,
} from "@/lib/workout-validation";

const base: WorkoutExerciseInput = { exerciseId: "ex1" };

describe("validateExerciseInput (T-20 range validation)", () => {
  it("accepts a minimal valid exercise", () => {
    expect(validateExerciseInput(base)).toBeNull();
  });

  it("accepts full valid ranges", () => {
    expect(
      validateExerciseInput({
        ...base,
        sets: 4,
        repsMin: 6,
        repsMax: 10,
        loadKg: 60,
        rpe: 8,
        rir: 2,
        restSeconds: 90,
      })
    ).toBeNull();
  });

  it("requires exerciseId", () => {
    expect(validateExerciseInput({ exerciseId: "" })).toMatch(/exerciseId/);
  });

  it("rejects rpe outside 1–10", () => {
    expect(validateExerciseInput({ ...base, rpe: 0 })).toMatch(/rpe/);
    expect(validateExerciseInput({ ...base, rpe: 11 })).toMatch(/rpe/);
  });

  it("rejects rir outside 0–5", () => {
    expect(validateExerciseInput({ ...base, rir: -1 })).toMatch(/rir/);
    expect(validateExerciseInput({ ...base, rir: 6 })).toMatch(/rir/);
  });

  it("rejects negative reps/load", () => {
    expect(validateExerciseInput({ ...base, repsMin: -1 })).toMatch(/repsMin/);
    expect(validateExerciseInput({ ...base, loadKg: -5 })).toMatch(/loadKg/);
  });

  it("rejects repsMax < repsMin", () => {
    expect(validateExerciseInput({ ...base, repsMin: 10, repsMax: 6 })).toMatch(/repsMax/);
  });

  it("accepts rir=0 and rpe=1 (boundary)", () => {
    expect(validateExerciseInput({ ...base, rir: 0, rpe: 1 })).toBeNull();
  });

  it("rejects non-integer Int fields (sets/reps/restSeconds)", () => {
    expect(validateExerciseInput({ ...base, sets: 3.5 })).toMatch(/sets/);
    expect(validateExerciseInput({ ...base, repsMin: 8.2 })).toMatch(/repsMin/);
    expect(validateExerciseInput({ ...base, restSeconds: 90.5 })).toMatch(/restSeconds/);
  });

  it("rejects non-finite numbers (Infinity/NaN)", () => {
    expect(validateExerciseInput({ ...base, loadKg: Infinity })).toMatch(/loadKg/);
    expect(validateExerciseInput({ ...base, loadKg: NaN })).toMatch(/loadKg/);
    expect(validateExerciseInput({ ...base, sets: Infinity })).toMatch(/sets/);
  });

  it("accepts a decimal loadKg (Float column)", () => {
    expect(validateExerciseInput({ ...base, loadKg: 62.5 })).toBeNull();
  });
});

describe("validateExercises (list)", () => {
  it("null/empty is valid", () => {
    expect(validateExercises(null)).toBeNull();
    expect(validateExercises([])).toBeNull();
  });
  it("non-array is rejected", () => {
    expect(validateExercises({} as unknown)).toMatch(/array/);
  });
  it("surfaces the first invalid exercise", () => {
    expect(validateExercises([base, { ...base, rpe: 99 }])).toMatch(/rpe/);
  });
});

/**
 * Build-time switches. `EXPO_PUBLIC_*` values are inlined by Expo when the
 * bundle is built, so these are decided per build, not at runtime.
 */

/**
 * O laboratório **não** é mais decidido aqui.
 *
 * Era `EXPO_PUBLIC_SHOW_LAB`, inlinado no bundle: mudar de ideia custava um
 * binário novo, e o interruptor ficava longe de quem decide. Agora é um dado
 * da clínica (`Clinic.labVisibleInApp`), ligado e desligado em /admin/labs, e
 * o servidor responde `/api/mobile/modules` de acordo. Desligado, o módulo
 * some do app na próxima vez que ele pergunta — sem build, sem update.
 */


/**
 * Whether this build goes straight into the clinic.
 *
 * The chooser exists because one account can hold several areas — the clinic,
 * the laboratory, BA. But this binary is *the BPR clinic app*: a patient signs
 * in to see their sessions, and the first thing they met was a question they
 * had no reason to answer, with two doors that are not what they came for.
 *
 * With this on, a patient the server already recognises as a clinic patient
 * goes straight to the clinic and never sees the chooser; "Switch module"
 * leaves the profile with it. Anyone *without* `clinica` — a studio's student,
 * a lab-only account — still gets the chooser, because for them it is the only
 * way in.
 *
 * Default is **on**. The chooser comes back with:
 *
 *     EXPO_PUBLIC_CLINIC_ONLY=false eas build --profile production --platform ios
 */
export const CLINIC_ONLY = process.env.EXPO_PUBLIC_CLINIC_ONLY !== "false";

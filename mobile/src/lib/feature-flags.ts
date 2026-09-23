/**
 * Build-time switches. `EXPO_PUBLIC_*` values are inlined by Expo when the
 * bundle is built, so these are decided per build, not at runtime.
 */

/**
 * Whether the Laboratory module is offered in this build.
 *
 * The lab screens — catalogue, test detail, collection method, checkout,
 * orders and results — are all finished and ship in every build. What changes
 * is whether a patient can reach them.
 *
 * Default is **on**, so the module is there to try. For the build that goes to
 * patients before the laboratory's own API is connected, set
 * `EXPO_PUBLIC_SHOW_LAB=false`:
 *
 *     EXPO_PUBLIC_SHOW_LAB=false eas build --profile production --platform ios
 *
 * With it off, the server decides as it otherwise would: the lab appears only
 * for a clinic that has `DIAGNOSTICS` enabled in ClinicModuleAccess — the data
 * switch that needs no new build at all.
 *
 * This only ever *adds* the lab for someone the server already recognises as a
 * clinic patient. A studio's students are a different product and never see
 * it: their module list has no `clinica` in it, which is the condition the
 * chooser and the route guard both check.
 */
export const SHOW_LAB = process.env.EXPO_PUBLIC_SHOW_LAB !== "false";

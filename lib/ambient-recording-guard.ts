// Tiny shared flag (activity 64) — lets anything in the app check "is an
// ambient (consultation) recording currently active?" without prop-drilling
// through the admin layout. Used by VersionChecker to never auto-reload the
// page while a live recording would be silently killed by it.

let active = false;

export function setAmbientRecordingActive(value: boolean): void {
  active = value;
}

export function isAmbientRecordingActive(): boolean {
  return active;
}

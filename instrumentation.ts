// Next.js instrumentation hook — runs once when the server process starts,
// before it accepts any requests. Used to boot the in-process background
// scheduler (see lib/background-jobs.ts) so Instagram token refresh and
// scheduled-post publishing happen automatically, with no external cron
// service or manual page visit required.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startBackgroundJobs } = await import('./lib/background-jobs');
    startBackgroundJobs();
  }
}

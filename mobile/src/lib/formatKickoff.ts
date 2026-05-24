/** Kickoff display: `mm-dd hh:mm:ss` in local time (API `starts_at` is Unix ms). */
export function formatKickoffMs(ms: number): string {
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) {
    return String(ms);
  }
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/**
 * Flight departure/arrival times are edited and stored as absolute instants (ISO
 * in DB). Form fields use Zulu wall clock: `YYYY-MM-DDTHH:mm` with no offset —
 * always interpreted as UTC, never the browser’s local timezone.
 */

export function isoTimestampToUtcField(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const p = (n: number) => n.toString().padStart(2, "0");
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}T${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}

/**
 * Accepts:
 * - `YYYY-MM-DDTHH:mm` or `YYYY-MM-DD HH:mm` (optional `:ss`) — **UTC** wall time
 * - Any string `Date` can parse with explicit `Z` or a numeric offset (stored as ISO UTC)
 */
export function parseUtcFieldToIso(value: string): string | null {
  const t = value.trim();
  if (t === "") return null;

  const hasExplicitZone =
    /Z$/i.test(t) ||
    /[+-]\d{2}:\d{2}$/.test(t) ||
    /[+-]\d{4}$/.test(t);
  if (hasExplicitZone) {
    const d = new Date(t);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }

  const m =
    /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/.exec(t);
  if (!m) return null;

  const y = Number(m[1]);
  const mo = Number(m[2]);
  const day = Number(m[3]);
  const h = Number(m[4]);
  const min = Number(m[5]);
  const s = m[6] != null ? Number(m[6]) : 0;
  if (
    [y, mo, day, h, min, s].some(
      (n) => !Number.isFinite(n) || Number.isNaN(n),
    )
  ) {
    return null;
  }
  const ms = Date.UTC(y, mo - 1, day, h, min, s);
  if (Number.isNaN(ms)) return null;
  return new Date(ms).toISOString();
}

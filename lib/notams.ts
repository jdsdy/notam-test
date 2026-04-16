/** NOTAM record shape extracted from a flight plan (PDF) — matches downstream filters. */
export type RawNotam = {
  id: string;
  title: string;
  q: string;
  a: string;
  b: string;
  c: string;
  d?: string;
  e: string;
  f?: string;
  g?: string;
};

export type RawNotamsPayload = { notams: RawNotam[] };

/** After AI analysis — category + summary plus original NOTAM fields. */
export type AnalysedNotam = RawNotam & {
  category: 1 | 2 | 3;
  summary: string;
};

export type AnalysedNotamsPayload = { notams: AnalysedNotam[] };

/** Latest stored analysis row, safe to pass from RSC into client components. */
export type LatestNotamAnalysisForClient = {
  id: string;
  createdAt: string;
  analysed: AnalysedNotamsPayload;
};

/** Ten representative dummy NOTAMs bundled with simulated PDF parse (until a live feed exists). */
export const DUMMY_FLIGHT_PLAN_NOTAMS: RawNotam[] = [
  {
    id: "A1234/26",
    title: "RWY 09/27 CLSD",
    q: "KPTK/QMRLC/IV/NBO/W /000/999/4233N08325W005",
    a: "KPTK",
    b: "2604161200",
    c: "2604161800",
    d: "SAT SUN",
    e: "RWY 09/27 CLSD DUE WIP. ACFT MAY USE TWY ALPHA FOR ACCESS TO APRON 1 ONLY.",
    f: "SFC",
    g: "UNL",
  },
  {
    id: "A1235/26",
    title: "GPS RAIM OUTAGES PREDICTED",
    q: "KORD/QXXXX/IV/NBO/W /245/999/4159N08754W010",
    a: "KORD",
    b: "2604161400",
    c: "2604161600",
    e: "GPS MAY NOT BE AVAILABLE FOR RNP APPROACHES. PLAN CONVENTIONAL NAV OR HOLD.",
    f: "FL245",
    g: "UNL",
  },
  {
    id: "A1236/26",
    title: "TWY B PART CLSD",
    q: "KPTK/QMXLC/IV/M /000/999/4233N08325W005",
    a: "KPTK",
    b: "2604150900",
    c: "2604302359",
    e: "TWY B CL BTN INTERSECTIONS B3 AND B5. MARKINGS OBSCURED.",
    f: "SFC",
    g: "SFC",
  },
  {
    id: "A1237/26",
    title: "ILS RWY 28C U/S",
    q: "KORD/QICAS/I /NBO/A /000/999/4159N08754W010",
    a: "KORD",
    b: "2604161300",
    c: "2604162100",
    e: "ILS RWY 28C U/S DUE MAINT. RNAV (GPS) Y RWY 28C AVAILABLE.",
    f: "SFC",
    g: "2500FT AGL",
  },
  {
    id: "A1238/26",
    title: "OBST CRANE 385FT AMSL",
    q: "KPTK/QOBCE/IV/M /000/999/4234N08324W002",
    a: "KPTK",
    b: "2604100001",
    c: "2605012359",
    e: "OBST CRANE ERECTED 0.5NM NE AD, MARKED AND LGTD. MAX ELEV 385FT AMSL.",
    f: "SFC",
    g: "400FT AMSL",
  },
  {
    id: "A1239/26",
    title: "AD ATIS FREQ CHANGED TEMP",
    q: "KORD/QXXXX/IV/NBO/A /000/999/4159N08754W010",
    a: "KORD",
    b: "2604160000",
    c: "2604302359",
    e: "ATIS FREQ CHANGED TO 128.725 UFN. OLD FREQ 128.7 NOT MONITORED.",
    f: "SFC",
    g: "UNL",
  },
  {
    id: "A1240/26",
    title: "FIRE AND RESCUE DOWNGRADED",
    q: "KPTK/QFFXX/IV/NBO/A /000/999/4233N08325W005",
    a: "KPTK",
    b: "2604160600",
    c: "2604161400",
    d: "MON-FRI",
    e: "FIRE AND RESCUE CATEGORY DOWNGRADED TO CAT 4. CHECK MINima FOR OPS.",
    f: "SFC",
    g: "UNL",
  },
  {
    id: "A1241/26",
    title: "SID RNAV Z RWY 10R AMEND",
    q: "KORD/QXXXX/IV/NBO/A /000/999/4159N08754W010",
    a: "KORD",
    b: "2604010000",
    c: "PERM",
    e: "SID RNAV Z RWY 10R: CROSS AT OR ABOVE 4000FT AT WAYPOINT EMMIE UNLESS ATC.",
    f: "SFC",
    g: "FL240",
  },
  {
    id: "A1242/26",
    title: "BIRD CONCENTRATION AD VICINITY",
    q: "KPTK/QWLBW/IV/M /000/999/4233N08325W005",
    a: "KPTK",
    b: "2604161100",
    c: "2604162300",
    e: "BIRD FLOCKS ON AND IN VICINITY OF AD. HEIGHT UP TO 200FT AGL REPORTED.",
    f: "SFC",
    g: "200FT AGL",
  },
  {
    id: "A1243/26",
    title: "ZAU SECTOR FREQ SPLIT",
    q: "ZAU/QXXXX/IV/BO /W /000/999/4200N08800W050",
    a: "ZAU",
    b: "2604161500",
    c: "2604161900",
    e: "ARTCC SECTOR 15 SPLIT. ULTRA HIGH SECTOR ON 134.12, LOW ON 125.45.",
    f: "FL180",
    g: "UNL",
  },
];

export function isRawNotam(value: unknown): value is RawNotam {
  if (!value || typeof value !== "object") return false;
  const o = value as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.title === "string" &&
    typeof o.q === "string" &&
    typeof o.a === "string" &&
    typeof o.b === "string" &&
    typeof o.c === "string" &&
    typeof o.e === "string"
  );
}

export function parseRawNotamsFromFlightPlanJson(
  json: Record<string, unknown> | null,
): RawNotamsPayload | null {
  if (!json) return null;
  const raw = json.notams;
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const notams: RawNotam[] = [];
  for (const item of raw) {
    if (isRawNotam(item)) notams.push(item);
  }
  if (notams.length === 0) return null;
  return { notams };
}

export function countNotamsInFlightPlanJson(
  json: Record<string, unknown> | null,
): number {
  return parseRawNotamsFromFlightPlanJson(json)?.notams.length ?? 0;
}

const CATEGORY_SUMMARIES: Record<
  1 | 2 | 3,
  (n: RawNotam) => string
> = {
  1: (n) =>
    `High operational impact: ${n.title.toLowerCase()} — review alternates, minima, and timing before departure.`,
  2: (n) =>
    `Moderate impact: ${n.title.toLowerCase()} — confirm briefing items and any procedure changes with ATC.`,
  3: (n) =>
    `Advisory / low impact: ${n.title.toLowerCase()} — note for situational awareness; unlikely to change your filed plan.`,
};

/** Deterministic “AI” output for development (replace with real model integration). */
export function buildSimulatedAnalysedNotams(raw: RawNotamsPayload): AnalysedNotamsPayload {
  const notams: AnalysedNotam[] = raw.notams.map((n, i) => {
    const category = ((i % 3) + 1) as 1 | 2 | 3;
    return {
      ...n,
      category,
      summary: CATEGORY_SUMMARIES[category](n),
    };
  });
  return { notams };
}

export function parseAnalysedNotamsPayload(
  value: unknown,
): AnalysedNotamsPayload | null {
  if (!value || typeof value !== "object") return null;
  const o = value as Record<string, unknown>;
  if (!Array.isArray(o.notams)) return null;
  const notams: AnalysedNotam[] = [];
  for (const item of o.notams) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    let category: 1 | 2 | 3 | null = null;
    const cat = r.category;
    if (cat === 1 || cat === 2 || cat === 3) {
      category = cat;
    } else if (typeof cat === "string" || typeof cat === "number") {
      const n = Number.parseInt(String(cat), 10);
      if (n === 1 || n === 2 || n === 3) category = n;
    }
    const summary = typeof r.summary === "string" ? r.summary : null;
    if (category == null || summary == null) continue;
    const base: Partial<RawNotam> = {
      id: typeof r.id === "string" ? r.id : "",
      title: typeof r.title === "string" ? r.title : "",
      q: typeof r.q === "string" ? r.q : "",
      a: typeof r.a === "string" ? r.a : "",
      b: typeof r.b === "string" ? r.b : "",
      c: typeof r.c === "string" ? r.c : "",
      e: typeof r.e === "string" ? r.e : "",
    };
    if (typeof r.d === "string") base.d = r.d;
    if (typeof r.f === "string") base.f = r.f;
    if (typeof r.g === "string") base.g = r.g;
    if (!isRawNotam(base)) continue;
    notams.push({ ...base, category, summary });
  }
  return notams.length ? { notams } : null;
}

export function notamCategoryStyles(category: 1 | 2 | 3): {
  badgeClass: string;
  cardClass: string;
} {
  switch (category) {
    case 1:
      return {
        badgeClass:
          "border-red-500/50 bg-red-500/15 text-red-800 dark:text-red-200",
        cardClass: "border-l-4 border-red-500/80 bg-red-500/[0.06]",
      };
    case 2:
      return {
        badgeClass:
          "border-amber-500/50 bg-amber-500/15 text-amber-900 dark:text-amber-100",
        cardClass: "border-l-4 border-amber-500/80 bg-amber-500/[0.07]",
      };
    case 3:
      return {
        badgeClass:
          "border-sky-500/50 bg-sky-500/15 text-sky-900 dark:text-sky-100",
        cardClass: "border-l-4 border-sky-500/70 bg-sky-500/[0.06]",
      };
  }
}

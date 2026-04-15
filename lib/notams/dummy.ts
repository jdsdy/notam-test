export type NotamCategoryName = "Category 1" | "Category 2" | "Category 3";

export type ProcessedNotam = {
  id: string;
  title: string;
  summary: string;
  sourceDocument: string;
  detail: {
    operationalImpact: string;
    recommendation: string;
    effectiveWindow: string;
  };
};

export type ProcessedNotamCategory = {
  category: NotamCategoryName;
  description: string;
  items: ProcessedNotam[];
};

export type ProcessedNotamResponse = {
  processedAt: string;
  categories: ProcessedNotamCategory[];
};

export function buildDummyNotamResponse(
  sourceDocument: string,
): ProcessedNotamResponse {
  return {
    processedAt: new Date().toISOString(),
    categories: [
      {
        category: "Category 1",
        description: "Routine operational awareness and low-risk notices.",
        items: [
          {
            id: "notam-cat1-1",
            title: "Apron taxi guideline repaint at LFPB",
            summary:
              "Temporary repaint works active on apron edge markings with minor taxi-flow adjustments.",
            sourceDocument,
            detail: {
              operationalImpact:
                "Expected to add 2-4 minutes during peak movement windows.",
              recommendation:
                "Brief crews to expect marshaller instructions on arrival and departure.",
              effectiveWindow: "Daily 0700-1700 local until 2026-05-01",
            },
          },
        ],
      },
      {
        category: "Category 2",
        description: "Moderate constraints requiring dispatch and crew planning.",
        items: [
          {
            id: "notam-cat2-1",
            title: "Night fueling slot compression at EGGW",
            summary:
              "Jet-A uplift windows reduced to two coordinated slots for overnight departures.",
            sourceDocument,
            detail: {
              operationalImpact:
                "Late uplift requests may push ETD by 15-25 minutes.",
              recommendation:
                "Lock fuel order before arrival and confirm handler allocation with ground ops.",
              effectiveWindow: "2200-0500 local through 2026-06-15",
            },
          },
        ],
      },
      {
        category: "Category 3",
        description: "High-priority notices with direct mission or safety impact.",
        items: [
          {
            id: "notam-cat3-1",
            title: "Primary runway closure for emergency pavement inspection",
            summary:
              "Primary runway unavailable with all arrivals/departures moved to secondary runway with reduced throughput.",
            sourceDocument,
            detail: {
              operationalImpact:
                "High probability of flow-control delay and slot revision requirements.",
              recommendation:
                "Re-check departure slot assignment and uplift alternates for contingency.",
              effectiveWindow: "Immediate effect, expected review at 1900Z",
            },
          },
        ],
      },
    ],
  };
}

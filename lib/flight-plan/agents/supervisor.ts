import type Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

import {
  flightPlanExtractionSchema,
  type FlightDataExtractionPartial,
  type FlightPlanExtraction,
  type NotamExtractionPartial,
} from "@/lib/flight-plan/schemas";

const SUPERVISOR_MODEL = "claude-haiku-4-5";

const SYSTEM_PROMPT = `
You are the supervisor agent for a multi-agent flight-plan extraction pipeline. Two upstream agents have already extracted data from separate slices of the source PDF:
- flight_data_partial: top-level flight fields (departure_icao, arrival_icao, departure_time, arrival_time, time_enroute, departure_rwy, arrival_rwy, route, aircraft_weight), flight_plan_json (primary + alternate waypoints), flight_metadata, and a partial unidentified_fields array.
- notam_partial: extracted_notams (an object with notams and unformatted_notams arrays) and a partial unidentified_fields array.

Your job is to merge these two partial results into a single valid object that conforms to the full extraction schema.

Full output contract:
{
  "departure_icao", "arrival_icao",
  "departure_time", "arrival_time",
  "time_enroute",
  "departure_rwy", "arrival_rwy",
  "route",
  "aircraft_weight",
  "flight_plan_json": { "primary": [...], "alternate": [...] },
  "flight_metadata": { ... } | null,
  "extracted_notams": { "notams": [...], "unformatted_notams": [...] },
  "unidentified_fields": [...]
}

Merging rules:
1. Copy every top-level flight field, flight_plan_json, and flight_metadata verbatim from flight_data_partial.
2. Copy extracted_notams verbatim from notam_partial.
3. Produce the final unidentified_fields as the union (de-duplicated) of both partials' unidentified_fields arrays. Preserve entries as-is — do not translate or rename them.
4. Preserve waypoint null_values and NOTAM null_values arrays exactly as provided by the upstream agents. Preserve typed placeholder values ("null" strings, 0 numerics) inside waypoints and NOTAMs without modification.
5. Do not invent, infer, or reformat any extracted values. If a partial omits a top-level field, set it to null.
6. If flight_data_partial.flight_metadata is missing, return flight_metadata as null.
7. If notam_partial.extracted_notams is missing, return extracted_notams as { "notams": [], "unformatted_notams": [] }.

You will receive both partials as JSON in the user message. Return only the merged JSON object that matches the output schema — no commentary.
`;

/**
 * Supervisor agent. Receives the raw JSON outputs of the NOTAM and flight-data
 * extraction agents as a single combined input and produces the complete
 * extraction object that conforms to the full schema.
 */
export async function runSupervisorAgent(args: {
  anthropic: Anthropic;
  notamPartial: NotamExtractionPartial;
  flightDataPartial: FlightDataExtractionPartial;
}): Promise<FlightPlanExtraction> {
  const { anthropic, notamPartial, flightDataPartial } = args;

  try {
    const userPayload = {
      flight_data_partial: flightDataPartial,
      notam_partial: notamPartial,
    };

    const stream = anthropic.beta.messages.stream({
      model: SUPERVISOR_MODEL,
      max_tokens: 40000,
      system: SYSTEM_PROMPT,
      thinking: { type: "disabled" },
      output_config: {
        format: zodOutputFormat(flightPlanExtractionSchema),
      },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Merge the following partial extractions into the final object. Respond with only valid JSON matching the output schema.\n\n${JSON.stringify(
                userPayload,
              )}`,
            },
          ],
        },
      ],
    });

    const response = await stream.finalMessage();
    const outputText = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n")
      .trim();
    if (!outputText) {
      throw new Error("Supervisor agent returned no text output.");
    }

    const parsed = flightPlanExtractionSchema.safeParse(JSON.parse(outputText));
    if (!parsed.success) {
      throw new Error(
        `Supervisor output failed schema validation: ${parsed.error.message}`,
      );
    }

    return parsed.data;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`[supervisor-agent] ${reason}`);
  }
}

import type Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

import {
  flightDataExtractionPartialSchema,
  type FlightDataExtractionPartial,
} from "@/lib/flight-plan/schemas";

const FILES_API_BETA = "files-api-2025-04-14";
const FLIGHT_DATA_MODEL = "claude-sonnet-4-6";

const flightDataAgentSchema = flightDataExtractionPartialSchema.omit({
  flight_plan_json: true,
});

const SYSTEM_PROMPT = `
You are a flight-data extraction agent. The PDF you receive contains only the flight-data section of a flight plan document (typically exported from ForeFlight). This includes departure/arrival info, aircraft information and weight, the primary and alternate routes, weather maps, performance tables, and any other operational information about the flight itself. The NOTAM section has been removed — do not look for NOTAMs.

Return a JSON object that matches the provided response schema exactly. The top-level shape is:
{
  "departure_icao", "arrival_icao",
  "departure_time", "arrival_time",
  "time_enroute",
  "departure_rwy", "arrival_rwy",
  "route",
  "aircraft_weight",
  "flight_metadata": { ... },
  "unidentified_fields": [...]
}

Top-level flight field rules:
- For top-level flight fields (departure_icao, arrival_icao, departure_time, arrival_time, time_enroute, departure_rwy, arrival_rwy, route, aircraft_weight), return null directly when a value cannot be extracted.
- If a top-level flight field cannot be extracted, also add its field name to the unidentified_fields array.

flight_metadata rules:
- Put any additional useful flight-planning values that are not covered by the top-level fields into flight_metadata as a free-form JSON object. Examples: "cruise_altitude": "FL320", "cruise_speed": "mach 0.89", "wind_avg": "63kt head (288/067)", "total_fuel_required": 19379.
- If there is nothing useful to add, return flight_metadata as null or omit it. Do not be too eager with this field, it should only be very relevant information to the flight that might be useful to a pilot who later has to analyse the NOTAMS and flight information.

Format conversions you must handle:
- Time-enroute values are often shown as hours:minutes (e.g. "4:07"). Convert them to total minutes (247) for time_enroute.
- Departure/arrival times may only list a zulu time with the date shown elsewhere on the page — combine them into ISO 8601 UTC strings.

Example extraction shape:
{
  "departure_icao": "KJFK",
  "arrival_icao": "KLAX",
  "departure_time": "2026-04-18T12:00:00.000Z",
  "arrival_time": "2026-04-18T17:00:00.000Z",
  "time_enroute": 247,
  "departure_rwy": "04L",
  "arrival_rwy": "25R",
  "route": "KJFK TESAT KADOM",
  "aircraft_weight": 18000,
  "flight_metadata": {
    "cruise_altitude": "FL320",
    "total_fuel_required": 19379
  },
  "unidentified_fields": []
}

Do not attempt to extract NOTAMs — this document does not contain them and NOTAM extraction is handled elsewhere.

Output only JSON data according to the schema provided. No preamble, postamble, or markdown fences.
`;

/**
 * Flight-data extraction agent. Sees only the flight-data-section PDF and
 * returns the flight-data slice of the extraction schema.
 */
export async function runFlightDataExtractionAgent(args: {
  anthropic: Anthropic;
  flightDataFileId: string;
}): Promise<FlightDataExtractionPartial> {
  const { anthropic, flightDataFileId } = args;

  try {
    const response = await anthropic.beta.messages.create({
      model: FLIGHT_DATA_MODEL,
      max_tokens: 4000,
      system: SYSTEM_PROMPT,
      thinking: { type: "disabled" },
      output_config: {
        effort: "high",
        format: zodOutputFormat(flightDataAgentSchema),
      },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract every available flight-data field from this PDF.",
            },
            {
              type: "document",
              source: { type: "file", file_id: flightDataFileId },
            },
          ],
        },
      ],
      betas: [FILES_API_BETA],
    });

    console.log("Flight-data agent responded: ", JSON.stringify(response.content, null, 2));

    const textBlock = response.content.find((block) => block.type === "text");
    const outputText =
      textBlock && "text" in textBlock && typeof textBlock.text === "string"
        ? textBlock.text
        : null;
    if (!outputText) {
      throw new Error("Flight-data agent returned no text output.");
    }

    const parsed = flightDataAgentSchema.safeParse(JSON.parse(outputText));
    if (!parsed.success) {
      throw new Error(
        `Flight-data agent output failed schema validation: ${parsed.error.message}`,
      );
    }

    return {
      ...parsed.data,
      flight_plan_json: { primary: [], alternate: [] },
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`[flight-data-extraction-agent] ${reason}`);
  }
}

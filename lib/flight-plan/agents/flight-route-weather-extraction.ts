import type Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

import {
  flightRouteWeatherExtractionPartialSchema,
  type FlightRouteWeatherExtractionPartial,
} from "@/lib/flight-plan/schemas";

const FILES_API_BETA = "files-api-2025-04-14";
const ROUTE_TABLE_MODEL = "claude-sonnet-4-6";

const SYSTEM_PROMPT = `You extract the flight route from a ForeFlight-style PDF segment that shows only the **route / weather breakdown table**.

This table is compact: the **left column** lists each route waypoint in order (often airport codes, fixes, or airway segments). Columns to the right contain wind and other weather data — **ignore those for route**.

Your task:
1. Read the **left-hand waypoint column** from top to bottom.
2. Build a single space-separated route string in flight order (same style as ForeFlight route lines: ICAO codes and identifiers separated by spaces).
3. Do not invent waypoints. If the column is unreadable or missing, set route to null and include "route" in unidentified_fields.

Return JSON only matching the schema.`;

export async function runFlightRouteWeatherTableAgent(args: {
  anthropic: Anthropic;
  routeTableFileId: string;
}): Promise<FlightRouteWeatherExtractionPartial> {
  const { anthropic, routeTableFileId } = args;

  try {
    const response = await anthropic.beta.messages.create({
      model: ROUTE_TABLE_MODEL,
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      thinking: { type: "disabled" },
      output_config: {
        format: zodOutputFormat(flightRouteWeatherExtractionPartialSchema),
      },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract the route waypoints from the left column of this table PDF.",
            },
            {
              type: "document",
              source: { type: "file", file_id: routeTableFileId },
            },
          ],
        },
      ],
      betas: [FILES_API_BETA],
    });


    const outputText = response.content
      .filter((block) => block.type === "text")
      .map((block) => ("text" in block ? block.text : ""))
      .join("\n")
      .trim();
    if (!outputText) {
      throw new Error("Route-table agent returned no text output.");
    }

    console.log("Route-table agent responded: ", outputText)

    const parsed = flightRouteWeatherExtractionPartialSchema.safeParse(
      JSON.parse(outputText),
    );
    if (!parsed.success) {
      return {
        route: null,
        unidentified_fields: ["route"],
      };
    }
    return parsed.data;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`[flight-route-weather-extraction-agent] ${reason}`);
  }
}

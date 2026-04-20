/**
 * NOTAM-specific feedback: stored in `feedback.reason` as JSON.
 * `text` holds the pilot's free-form comment; `reason` holds structured context.
 */
export const NOTAM_FEEDBACK_ASPECT_IDS = [
  "incorrect_categorisation",
  "poor_data_extraction",
  "poor_notam_summary",
] as const;

export type NotamFeedbackAspectId = (typeof NOTAM_FEEDBACK_ASPECT_IDS)[number];

export const NOTAM_FEEDBACK_ASPECT_LABELS: Record<NotamFeedbackAspectId, string> = {
  incorrect_categorisation: "Incorrect categorisation",
  poor_data_extraction: "Poor data extraction",
  poor_notam_summary: "Poor notam summary",
};

export type NotamFeedbackReasonPayload = {
  notam_id: string | null;
  aspects: NotamFeedbackAspectId[];
};

export function isNotamFeedbackAspectId(value: string): value is NotamFeedbackAspectId {
  return (NOTAM_FEEDBACK_ASPECT_IDS as readonly string[]).includes(value);
}

export function encodeNotamFeedbackReason(payload: NotamFeedbackReasonPayload): string {
  return JSON.stringify(payload);
}

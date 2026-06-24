/**
 * The Remember tab (`/(tabs)/gratitude`) hosts three segments. These live on a
 * single screen via a segmented control; the selected segment can be driven by
 * a `segment` search param so create screens can return the user to the right
 * place after saving.
 */
export type RememberSegment = "gratitudes" | "faithfulness" | "lessons";

/** Default segment when no (or an invalid) param is present. */
export const DEFAULT_REMEMBER_SEGMENT: RememberSegment = "gratitudes";

/**
 * Parse a `segment` search param into a valid {@link RememberSegment}. Accepts
 * both "gratitude" and "gratitudes" for the gratitude segment so callers can use
 * the natural singular in URLs. Anything unrecognized (including undefined or an
 * array) falls back calmly to the default segment.
 */
export function parseRememberSegment(
  value: string | string[] | undefined | null,
): RememberSegment {
  const raw = Array.isArray(value) ? value[0] : value;
  switch (raw) {
    case "gratitude":
    case "gratitudes":
      return "gratitudes";
    case "faithfulness":
      return "faithfulness";
    case "lessons":
      return "lessons";
    default:
      return DEFAULT_REMEMBER_SEGMENT;
  }
}

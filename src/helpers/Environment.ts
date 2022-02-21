/**
 * Returns env contingent segment api key
 * @returns segment
 */
export function getSegmentKey() {
  return process.env.REACT_APP_SEGMENT_API_KEY;
}

export function getGeoapifyAPIKey() {
  const apiKey = process.env.REACT_APP_GEOAPIFY_API_KEY;
  if (!apiKey) {
    console.warn("Missing REACT_APP_GEOAPIFY_API_KEY environment variable");
    return null;
  }

  return apiKey;
}

function hectorEnv(): "prod" | "qa" | "dev" {
  if (!process.env.REACT_APP_HECTOR_ENV) {
    return "prod";
  }
  switch (process.env.REACT_APP_HECTOR_ENV.toLowerCase()) {
    case "prod":
      return "prod";
    case "qa":
      return "qa";
    case "dev":
      return "dev";
    default:
      return "prod";
  }
}
export const HECTOR_ENV = hectorEnv();

export const BASE_PATH = process.env.REACT_APP_BASE_PATH?.toLowerCase() ?? undefined;

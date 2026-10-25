/// <reference types="vite/client" />

interface FlybyEmbedApi {
  setSpeed: (scale: number) => void;
  /** Manifest index, or "random" / null to pick again on the next flyby. */
  setAircraft: (indexOrRandom: number | "random" | null) => void;
}

interface Window {
  /** Available after the flyby:ready event; embeds also receive a { type: "flyby:ready" } message. */
  flyby?: FlybyEmbedApi;
}

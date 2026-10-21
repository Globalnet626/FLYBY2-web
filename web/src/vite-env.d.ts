/// <reference types="vite/client" />

interface FlybyEmbedApi {
  setSpeed: (scale: number) => void;
  /** Manifest index, or "random" / null to pick again on the next flyby. */
  setAircraft: (indexOrRandom: number | "random" | null) => void;
}

interface Window {
  flyby?: FlybyEmbedApi;
}

import { FlybyApp } from "./app";

const canvas = document.querySelector<HTMLCanvasElement>("#view");
const overlay = document.querySelector<HTMLElement>("#overlay");
const overlayText = document.querySelector<HTMLElement>("#overlayText");
const progressBar = document.querySelector<HTMLElement>("#progress > span");
const aircraftLabel = document.querySelector<HTMLElement>("#aircraftLabel");
const maneuverLabel = document.querySelector<HTMLElement>("#maneuverLabel");
const fpsLabel = document.querySelector<HTMLElement>("#fpsLabel");
const aircraftSelect = document.querySelector<HTMLSelectElement>("#aircraftSelect");
const btnPause = document.querySelector<HTMLButtonElement>("#btnPause");
const btnRestart = document.querySelector<HTMLButtonElement>("#btnRestart");
const btnShot = document.querySelector<HTMLButtonElement>("#btnShot");

if (
  !canvas ||
  !overlay ||
  !overlayText ||
  !progressBar ||
  !aircraftLabel ||
  !maneuverLabel ||
  !fpsLabel ||
  !aircraftSelect ||
  !btnPause ||
  !btnRestart ||
  !btnShot
) {
  throw new Error("Missing required DOM nodes");
}

const app = new FlybyApp(canvas, {
  overlay,
  overlayText,
  progressBar,
  aircraftLabel,
  maneuverLabel,
  fpsLabel,
  aircraftSelect,
  btnPause,
  btnRestart,
  btnShot,
});

void app.start();

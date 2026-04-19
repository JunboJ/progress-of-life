import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import { CanvasEngine } from "./canvas/engine.ts";
import { calculateLifeStats } from "./utils/lifeCalculations.ts";

dayjs.extend(isSameOrAfter);

const DEFAULT_LIFE_EXPECTANCY = 80;

const { startDate, today, days } = calculateLifeStats(DEFAULT_LIFE_EXPECTANCY, "");

const canvasRoot = document.getElementById("canvas-root")!;
const engine = new CanvasEngine(canvasRoot, {
  days,
  startDate,
  today,
  gridWidth: 8000,
  collapseGridGap: false,
  animateHighlight: false,
});
engine.mount();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App engine={engine} />
  </StrictMode>,
);

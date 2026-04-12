import { useState } from "react";
import "./App.css";
import { ProgressGridTable } from "./components/progressGridTable/ProgressGridTable";
import { CellTooltip } from "./components/cellTooltip/CellTooltip";
import ProgressGridCanvas from "./components/progressGridCanvas/ProgressGridCanvas";
import SettingsModal from "./components/SettingsModal";
import { calculateLifeStats } from "./utils/lifeCalculations";

const DEFAULT_LIFE_EXPECTANCY = 80;

function App() {
  const [lifeSpan, setLifeSpan] = useState<number>(DEFAULT_LIFE_EXPECTANCY);
  const [dob, setDob] = useState("");
  const [useTable, setUseTable] = useState(false);
  const [animateHighlight, setAnimateHighlight] = useState(false);
  const [autoOpenSettings, setAutoOpenSettings] = useState(dob === "");

  const { startDate, endDate, today, months, days, daysLived } = calculateLifeStats(lifeSpan, dob);

  const handleSaveSettings = (newLifeSpan: number, newDob: string, newUseTable: boolean) => {
    setLifeSpan(newLifeSpan);
    setDob(newDob);
    setUseTable(newUseTable);
    setAnimateHighlight(!!newDob);
    setAutoOpenSettings(false);
  };

  const handleAnimationFinished = () => {
    setAnimateHighlight(false);
  };

  return (
    <div className="app-root root night-mode-color">
      <div className="canvas-area">
        {useTable ? (
          <ProgressGridTable startDate={startDate} today={today} days={days} />
        ) : (
          <ProgressGridCanvas
            startDate={startDate}
            endDate={endDate}
            today={today}
            days={days}
            animateHighlight={animateHighlight}
            onAnimationFinished={handleAnimationFinished}
          />
        )}
        <CellTooltip />
      </div>

      <SettingsModal
        lifeSpan={lifeSpan}
        dob={dob}
        useTable={useTable}
        today={today}
        months={months}
        daysLived={daysLived}
        onSave={handleSaveSettings}
        autoOpen={autoOpenSettings}
        onAutoOpenHandled={() => setAutoOpenSettings(false)}
      />
    </div>
  );
}

export default App;

import { useState } from "react";
import "./App.css";
import { ProgressGridTable } from "./components/progressGridTable/ProgressGridTable";
import { CellTooltip } from "./components/cellTooltip/CellTooltip";
import ProgressGridCanvas from "./components/progressGridCanvas/ProgressGridCanvas";
import SettingsModal from "./components/SettingsModal";
import { calculateLifeStats } from "./utils/lifeCalculations";

function App() {
  const [lifeSpan, setLifeSpan] = useState<number>(80);
  const [dob, setDob] = useState("1995-02-14");
  const [useTable, setUseTable] = useState(false);

  const { startDate, endDate, today, months, days, daysLived } = calculateLifeStats(lifeSpan, dob);

  const handleSaveSettings = (newLifeSpan: number, newDob: string, newUseTable: boolean) => {
    setLifeSpan(newLifeSpan);
    setDob(newDob);
    setUseTable(newUseTable);
  };

  return (
    <div className="app-root root night-mode-color">
      <div className="canvas-area">
        {useTable ? (
          <ProgressGridTable
            startDate={startDate}

            today={today}
            days={days}
          />
        ) : (
          <ProgressGridCanvas
            startDate={startDate}
            endDate={endDate}
            today={today}
            days={days}
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
      />
    </div>
  );
}

export default App;

import { useState } from "react";
import "./App.css";
import dayjs from "dayjs";
import { ProgressGridTable } from "./components/progressGridTable/ProgressGridTable";
import { CellTooltip } from "./components/cellTooltip/CellTooltip";
import ProgressGridCanvas from "./components/progressGridCanvas/ProgressGridCanvas";
import SettingsModal from "./components/SettingsModal";

function App() {
  const [lifeSpan, setLifeSpan] = useState<number>(80);
  const [dob, setDob] = useState("1995-02-14");
  const [useTable, setUseTable] = useState(false);

  const assumedDod = dayjs().add(lifeSpan, "y");
  const assumedDoB = dayjs();
  const startDate = dob ? dayjs(dob) : assumedDoB;
  const endDate = dob ? dayjs(dob).add(lifeSpan, "y") : assumedDod;
  const today = dayjs();
  const months = dayjs(endDate).diff(startDate, "M");
  const days = dayjs(endDate).diff(startDate, "d");
  const daysLived = dayjs().diff(startDate, "d");

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
            endDate={endDate}
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

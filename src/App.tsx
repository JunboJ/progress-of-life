import { useState } from "react";
import "./App.css";
import dayjs from "dayjs";
import { ProgressGridTable } from "./components/progressGridTable/ProgressGridTable";
import { CellTooltip } from "./components/cellTooltip/CellTooltip";
import ProgressGridCanvas from "./components/progressGridCanvas/ProgressGridCanvas";

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

  console.log("====== window", window.screen.availWidth);
  console.log("====== html", document.querySelector('html')?.clientWidth);

  return (
    <div className="root night-mode-color">
      {dob ? null : (
        <span>Without a date of birth the date will be inaccurate.</span>
      )}
      <span>Input your life span: ({lifeSpan})</span>
      <input
        type="number"
        placeholder="Your life span"
        value={lifeSpan}
        onChange={(e) => {
          setLifeSpan(Math.floor(Number(e.target.value)));
        }}
      />
      <span>Input your date of birth:</span>
      <input
        type="date"
        value={dob}
        onChange={(e) => {
          setDob(e.target.value);
        }}
        max={today.format("YYYY-MM-DD")}
      />
      <label style={{ display: "block", margin: "10px 0" }}>
        <input
          type="checkbox"
          onChange={() => {
            setUseTable((prev) => !prev);
          }}
          checked={useTable}
        />
        Use Table Grid System
      </label>
      <span>months lived: {months}</span>
      <span>days lived: {daysLived}</span>
      <div className="cell-container">
        <ProgressGridCanvas
            startDate={startDate}
            endDate={endDate}
            today={today}
            days={days} />
        <CellTooltip />
      </div>
    </div>
  );
}

export default App;

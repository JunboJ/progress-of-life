import { useState } from "react";
import "./App.css";
import { CellTooltip } from "./components/cellTooltip/CellTooltip";
import SettingsModal from "./components/SettingsModal";
import { calculateLifeStats } from "./utils/lifeCalculations";
import { CanvasEngine } from "./canvas/engine";

const DEFAULT_LIFE_EXPECTANCY = 80;

interface AppProps {
	engine: CanvasEngine;
}

function App({ engine }: AppProps) {
	const [lifeSpan, setLifeSpan] = useState<number>(DEFAULT_LIFE_EXPECTANCY);
	const [dob, setDob] = useState("");
	const [useTable, setUseTable] = useState(false);
	const [collapseGridGap, setCollapseGridGap] = useState(false);
	const [gridWidth, setGridWidth] = useState(8000);
	const [autoOpenSettings, setAutoOpenSettings] = useState(dob === "");

	const { today, months, daysLived } = calculateLifeStats(lifeSpan, dob);

	const handleSaveSettings = (
		newLifeSpan: number,
		newDob: string,
		newUseTable: boolean,
		newCollapseGridGap: boolean
	) => {
		setLifeSpan(newLifeSpan);
		setDob(newDob);
		setUseTable(newUseTable);
		setCollapseGridGap(newCollapseGridGap);
		setAutoOpenSettings(false);

		const stats = calculateLifeStats(newLifeSpan, newDob);
		engine.update({
			days: stats.days,
			startDate: stats.startDate,
			today: stats.today,
			collapseGridGap: newCollapseGridGap,
			animateHighlight: !!newDob,
			onAnimationFinished: () => {
				engine.update({ animateHighlight: false });
			},
		});
	};

	const handleGridWidthChange = (width: number) => {
		setGridWidth(width);
		engine.setGridWidth(width);
	};

	return (
		<>
			<CellTooltip />
			<input
				type="range"
				min="1000"
				max="10000"
				step="100"
				value={gridWidth}
				onChange={(e) => handleGridWidthChange(Number(e.target.value))}
				style={{
					position: "fixed",
					bottom: 16,
					right: 16,
					width: 200,
					cursor: "pointer",
					zIndex: 10,
				}}
				title={`Grid width: ${gridWidth}`}
			/>

			<SettingsModal
				lifeSpan={lifeSpan}
				dob={dob}
				useTable={useTable}
				collapseGridGap={collapseGridGap}
				today={today}
				months={months}
				daysLived={daysLived}
				onSave={handleSaveSettings}
				autoOpen={autoOpenSettings}
				onAutoOpenHandled={() => setAutoOpenSettings(false)}
			/>
		</>
	);
}

export default App;

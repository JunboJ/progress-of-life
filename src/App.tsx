import { useState, useMemo } from 'react'
import dayjs from 'dayjs'
import './App.css'
import { CellTooltip } from './components/cellTooltip/CellTooltip'
import SettingsModal from './components/SettingsModal'
import { calculateLifeStats } from './utils/lifeCalculations'
import { CanvasEngine } from './canvas/engine'
import { useCanvasEngineStore } from './store/canvasEngineStore'

const DEFAULT_LIFE_EXPECTANCY = 80

interface AppProps {
  engine: CanvasEngine
}

function App({ engine }: AppProps) {
  const [lifeSpan, setLifeSpan] = useState<number>(DEFAULT_LIFE_EXPECTANCY)
  const [dob, setDob] = useState('')
  const [useTable, setUseTable] = useState(false)
  const [collapseGridGap, setCollapseGridGap] = useState(false)
  const [gridWidth, setGridWidth] = useState(8000)
  const [autoOpenSettings, setAutoOpenSettings] = useState(dob === '')

  const { today, months, daysLived } = calculateLifeStats(lifeSpan, dob)

  const handleSaveSettings = (
    newLifeSpan: number,
    newDob: string,
    newUseTable: boolean,
    newCollapseGridGap: boolean,
  ) => {
    setLifeSpan(newLifeSpan)
    setDob(newDob)
    setUseTable(newUseTable)
    setCollapseGridGap(newCollapseGridGap)
    setAutoOpenSettings(false)

    const stats = calculateLifeStats(newLifeSpan, newDob)
    engine.update({
      days: stats.days,
      startDate: stats.startDate,
      today: stats.today,
      collapseGridGap: newCollapseGridGap,
      animateHighlight: !!newDob,
      onAnimationFinished: () => {
        engine.update({ animateHighlight: false })
      },
    })
  }

  const handleGridWidthChange = (width: number) => {
    setGridWidth(width)
    engine.setGridWidth(width)
  }

  const hoveredDate = useCanvasEngineStore((s) => s.hoveredDate)

  const proportionalInfo = useMemo(() => {
    if (!hoveredDate || !dob) return null
    const birthDate = dayjs(dob)
    const ageInYears = hoveredDate.diff(birthDate, 'year')
    if (ageInYears <= 0) return null
    const perceivedHours = 24 * (1 / ageInYears)
    return {
      date: hoveredDate.format('YYYY-MM-DD'),
      age: ageInYears,
      perceivedHours,
    }
  }, [hoveredDate, dob])

  return (
    <>
      <CellTooltip />

      {proportionalInfo && (
        <div
          style={{
            position: 'fixed',
            bottom: 48,
            left: 16,
            padding: '8px 12px',
            background: 'rgba(0, 0, 0, 0.75)',
            color: '#e0e0e0',
            borderRadius: 6,
            fontSize: 13,
            lineHeight: 1.5,
            zIndex: 10,
            pointerEvents: 'none',
            fontFamily: 'monospace',
          }}
        >
          <div>{proportionalInfo.date}</div>
          <div>Age {proportionalInfo.age.toFixed(1)}y</div>
          <div>
            A day feels like{' '}
            <span style={{ color: '#76c893', fontWeight: 600 }}>
              {proportionalInfo.perceivedHours >= 1
                ? `${proportionalInfo.perceivedHours.toFixed(1)}h`
                : `${(proportionalInfo.perceivedHours * 60).toFixed(0)}m`}
            </span>
          </div>
        </div>
      )}

      <input
        type="range"
        min="1000"
        max="10000"
        step="100"
        value={gridWidth}
        onChange={(e) => handleGridWidthChange(Number(e.target.value))}
        style={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          width: 200,
          cursor: 'pointer',
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
  )
}

export default App

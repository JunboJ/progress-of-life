import { Dayjs } from 'dayjs';
import { FillRectOptions } from "./canvas.type"
import { CalendarStyle } from "./style"
import { calculateCalendarDimension } from "./utils"

export const paintCell = (ctx: CanvasRenderingContext2D, options: FillRectOptions) => {
  ctx.save()
  ctx.fillStyle = options.backgroundColor ?? "#2d3a4a"
  ctx.fillRect(options.x, options.y, options.w, options.h)
  ctx.restore()
}

export const paintCanvas = (
  canvas: HTMLCanvasElement,
  {
    numberOfCells,
    canvasWidth,
    startDate,
    today,
    highlightCount,
    calendarStyle,
  }: {
    numberOfCells: number;
    canvasWidth: number;
    startDate: Dayjs;
    today: Dayjs;
    highlightCount?: number;
    calendarStyle: CalendarStyle;
  },
) => {
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return;
  }

  ctx.reset()

  const { numberOfCols, computedPaddingLeft, numberOfRows, daysOfLastRow } = calculateCalendarDimension(calendarStyle, { numberOfCells, canvasWidth });

  if (isNaN(numberOfCells) || isNaN(numberOfCols) || isNaN(numberOfRows)) {
    return;
  }

  const totalRendered = numberOfRows * numberOfCols + daysOfLastRow;
  console.log('paintCanvas:', { numberOfCells, canvasWidth, numberOfCols, numberOfRows, daysOfLastRow, totalRendered, match: totalRendered === numberOfCells });

  ctx.fillStyle = '#23272e';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  let cellIndex = 0;
  // Main grid
  for (let r = 0; r < numberOfRows; r++) {
    const y = r === 0 ? calendarStyle.paddingTop : ((calendarStyle.cellGap + calendarStyle.cellHeight) * r) + calendarStyle.paddingTop
    for (let c = 0; c < numberOfCols; c++) {
      const x = c === 0 ? computedPaddingLeft : ((calendarStyle.cellGap + calendarStyle.cellWidth) * c) + computedPaddingLeft
      const cellDate = startDate.add(cellIndex, 'day');
      const isPassed = !cellDate.isAfter(today, 'day');
      const isActive = highlightCount !== undefined ? cellIndex < highlightCount : isPassed;
      const backgroundColor = isActive ? '#0b3d91' : '#2d3a4a';
      paintCell(ctx, { x, y, h: calendarStyle.cellHeight, w: calendarStyle.cellWidth, backgroundColor })
      cellIndex++;
    }
  }

  // Last row (partial)
  for (let c = 0; c < daysOfLastRow; c++) {
    const x = c === 0 ? computedPaddingLeft : ((calendarStyle.cellGap + calendarStyle.cellWidth) * c) + computedPaddingLeft
    const y = numberOfRows === 0 ? calendarStyle.paddingTop : ((calendarStyle.cellGap + calendarStyle.cellHeight) * numberOfRows) + calendarStyle.paddingTop
    const cellDate = startDate.add(cellIndex, 'day');
    const isPassed = !cellDate.isAfter(today, 'day');
    const isActive = highlightCount !== undefined ? cellIndex < highlightCount : isPassed;
    const backgroundColor = isActive ? '#0b3d91' : '#2d3a4a';
    paintCell(ctx, { x, y, h: calendarStyle.cellHeight, w: calendarStyle.cellWidth, backgroundColor })
    cellIndex++;
  }
}


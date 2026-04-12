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

  ctx.fillStyle = '#23272e';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const activeThreshold = highlightCount !== undefined
    ? highlightCount
    : today.diff(startDate, 'day') + 1;

  const { cellWidth, cellHeight, cellGap, paddingTop } = calendarStyle;
  const colStride = cellWidth + cellGap;
  const rowStride = cellHeight + cellGap;
  const totalCells = numberOfRows * numberOfCols + daysOfLastRow;

  // Batch inactive cells into a single fill
  ctx.fillStyle = '#2d3a4a';
  ctx.beginPath();
  for (let i = activeThreshold; i < totalCells; i++) {
    const r = Math.floor(i / numberOfCols);
    const c = i % numberOfCols;
    ctx.rect(computedPaddingLeft + c * colStride, paddingTop + r * rowStride, cellWidth, cellHeight);
  }
  ctx.fill();

  // Batch active cells into a single fill
  const activeCount = Math.min(activeThreshold, totalCells);
  ctx.fillStyle = '#0b3d91';
  ctx.beginPath();
  for (let i = 0; i < activeCount; i++) {
    const r = Math.floor(i / numberOfCols);
    const c = i % numberOfCols;
    ctx.rect(computedPaddingLeft + c * colStride, paddingTop + r * rowStride, cellWidth, cellHeight);
  }
  ctx.fill();
}


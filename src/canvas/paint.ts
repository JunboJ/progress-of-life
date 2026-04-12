import { FillRectOptions } from "./canvas.type"
import { CalendarStyle } from "./style"
import { calculateCalendarDimension } from "./utils"

export const paintCell = (ctx: CanvasRenderingContext2D, options: FillRectOptions) => {
  ctx.save()
  ctx.fillStyle = options.backgroundColor ?? "#2d3a4a"
  ctx.fillRect(options.x, options.y, options.w, options.h)
  ctx.restore()
}

export const paintCanvas = (canvas: HTMLCanvasElement, { numberOfCells, canvasWidth }: {
  numberOfCells: number;
  canvasWidth: number;
}) => {
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return;
  }

  ctx.reset()

  const { numberOfCols, computedPaddingLeft, numberOfRows, daysOfLastRow } = calculateCalendarDimension(CalendarStyle, { numberOfCells, canvasWidth });

  if (isNaN(numberOfCells) || isNaN(numberOfCols) || isNaN(numberOfRows)) {
    return;
  }

  ctx.fillStyle = '#23272e';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  // TODO: transform to support scrolling
  //
  for (let r = 0; r < numberOfRows; r++) {
    const y = r === 0 ? CalendarStyle.paddingTop : ((CalendarStyle.cellGap + CalendarStyle.cellHeight) * r) + CalendarStyle.paddingTop
    for (let c = 0; c < numberOfCols; c++) {
      const x = c === 0 ? computedPaddingLeft : ((CalendarStyle.cellGap + CalendarStyle.cellWidth) * c) + computedPaddingLeft
      paintCell(ctx, { x, y, h: CalendarStyle.cellHeight, w: CalendarStyle.cellWidth })
    }
  }

  for (let c = 0; c < daysOfLastRow; c++) {
    const x = c === 0 ? computedPaddingLeft : ((CalendarStyle.cellGap + CalendarStyle.cellWidth) * c) + computedPaddingLeft
    const y = numberOfRows === 0 ? CalendarStyle.paddingTop : ((CalendarStyle.cellGap + CalendarStyle.cellHeight) * numberOfRows) + CalendarStyle.paddingTop
    paintCell(ctx, { x, y, h: CalendarStyle.cellHeight, w: CalendarStyle.cellWidth })
  }
}


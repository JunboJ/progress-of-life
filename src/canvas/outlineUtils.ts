import { Dayjs } from 'dayjs';
import { CalendarStyle } from './style';
import { calculateCalendarDimension } from './utils';

export interface OutlineBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface RowOutlineBounds extends OutlineBounds {
  row: number;
}

const getCellPosition = (
  cellIndex: number,
  { numberOfCols, computedPaddingLeft }: ReturnType<typeof calculateCalendarDimension>,
  calendarStyle: CalendarStyle,
) => {
  const row = Math.floor(cellIndex / numberOfCols);
  const col = cellIndex % numberOfCols;
  const x =
    col === 0 ? computedPaddingLeft : (calendarStyle.cellWidth + calendarStyle.cellGap) * col + computedPaddingLeft;
  const y = row === 0 ? calendarStyle.paddingTop : (calendarStyle.cellHeight + calendarStyle.cellGap) * row + calendarStyle.paddingTop;
  return { x, y, row, col };
};

const getCellIndex = (date: Dayjs, startDate: Dayjs) => {
  return date.diff(startDate, 'day');
};

export const getOutlineBounds = (
  startDate: Dayjs,
  hoverDate: Dayjs,
  numberOfCells: number,
  gridWidth: number,
  unit: 'year' | 'month' | 'week',
  calendarStyle: CalendarStyle,
): RowOutlineBounds[] | null => {
  const dimensions = calculateCalendarDimension(calendarStyle, { numberOfCells, canvasWidth: gridWidth });

  let groupStartDate: Dayjs;
  let groupEndDate: Dayjs;

  if (unit === 'year') {
    groupStartDate = hoverDate.startOf('year');
    groupEndDate = hoverDate.endOf('year');
  } else if (unit === 'month') {
    groupStartDate = hoverDate.startOf('month');
    groupEndDate = hoverDate.endOf('month');
  } else {
    // week
    groupStartDate = hoverDate.startOf('week');
    groupEndDate = hoverDate.endOf('week');
  }

  // Check if group intersects with calendar range
  if (groupEndDate.isBefore(startDate) || groupStartDate.isAfter(startDate.add(numberOfCells - 1, 'day'))) {
    return null;
  }

  // Clamp to calendar range
  const clampedStartDate = groupStartDate.isBefore(startDate) ? startDate : groupStartDate;
  const clampedEndDate = groupEndDate.isAfter(startDate.add(numberOfCells - 1, 'day'))
    ? startDate.add(numberOfCells - 1, 'day')
    : groupEndDate;

  const startIndex = getCellIndex(clampedStartDate, startDate);
  const endIndex = getCellIndex(clampedEndDate, startDate);

  if (startIndex < 0 || startIndex >= numberOfCells) {
    return null;
  }

  const startPos = getCellPosition(startIndex, dimensions, calendarStyle);
  const endPos = getCellPosition(endIndex, dimensions, calendarStyle);

  const bounds: RowOutlineBounds[] = [];

  if (startPos.row === endPos.row) {
    // Single row
    bounds.push({
      minX: startPos.x - 2,
      minY: startPos.y - 2,
      maxX: endPos.x + calendarStyle.cellWidth + 2,
      maxY: endPos.y + calendarStyle.cellHeight + 2,
      row: startPos.row,
    });
  } else {
    // Multiple rows
    // First row: from startPos to end of row
    const lastCellFirstRow = getCellPosition(startPos.row * dimensions.numberOfCols + dimensions.numberOfCols - 1, dimensions, calendarStyle);
    bounds.push({
      minX: startPos.x - 2,
      minY: startPos.y - 2,
      maxX: lastCellFirstRow.x + calendarStyle.cellWidth + 2,
      maxY: startPos.y + calendarStyle.cellHeight + 2,
      row: startPos.row,
    });

    // Intermediate rows: full width
    for (let row = startPos.row + 1; row < endPos.row; row++) {
      const firstCellOfRow = getCellPosition(row * dimensions.numberOfCols, dimensions, calendarStyle);
      const lastCellOfRow = getCellPosition(row * dimensions.numberOfCols + dimensions.numberOfCols - 1, dimensions, calendarStyle);
      bounds.push({
        minX: firstCellOfRow.x - 2,
        minY: firstCellOfRow.y - 2,
        maxX: lastCellOfRow.x + calendarStyle.cellWidth + 2,
        maxY: firstCellOfRow.y + calendarStyle.cellHeight + 2,
        row,
      });
    }

    // Last row: from start of row to endPos
    const firstCellLastRow = getCellPosition(endPos.row * dimensions.numberOfCols, dimensions, calendarStyle);
    bounds.push({
      minX: firstCellLastRow.x - 2,
      minY: endPos.y - 2,
      maxX: endPos.x + calendarStyle.cellWidth + 2,
      maxY: endPos.y + calendarStyle.cellHeight + 2,
      row: endPos.row,
    });
  }

  return bounds;
};

export const drawOutline = (
  ctx: CanvasRenderingContext2D,
  bounds: OutlineBounds,
  color: string,
  lineWidth: number = 2,
) => {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.strokeRect(bounds.minX, bounds.minY, bounds.maxX - bounds.minX, bounds.maxY - bounds.minY);
  ctx.restore();
};

export const drawMultiRowOutline = (
  ctx: CanvasRenderingContext2D,
  bounds: RowOutlineBounds[],
  color: string,
  lineWidth: number = 2,
) => {
  if (bounds.length === 0) return;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;

  // Draw separate outlines for each row segment
  bounds.forEach((bound) => {
    ctx.strokeRect(bound.minX, bound.minY, bound.maxX - bound.minX, bound.maxY - bound.minY);
  });

  ctx.restore();
};

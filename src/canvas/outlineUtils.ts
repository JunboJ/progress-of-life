import { DateObj, diffDates, addDuration, isAfter, isBefore, startOf, endOf } from '../utils/date';
import { CalendarStyle } from './style';
import { calculateCalendarDimension } from './utils';
import { OUTLINE_CELL_PADDING } from './constants';

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

const getCellIndex = (date: DateObj, startDate: DateObj) => {
  return diffDates(date, startDate, 'day');
};

export const getOutlineBounds = (
  startDate: DateObj,
  hoverDate: DateObj,
  numberOfCells: number,
  gridWidth: number,
  unit: 'year' | 'month' | 'week',
  calendarStyle: CalendarStyle,
): RowOutlineBounds[] | null => {
  const dimensions = calculateCalendarDimension(calendarStyle, { numberOfCells, canvasWidth: gridWidth });

  let groupStartDate: DateObj;
  let groupEndDate: DateObj;

  if (unit === 'year') {
    groupStartDate = startOf(hoverDate, 'year');
    groupEndDate = endOf(hoverDate, 'year');
  } else if (unit === 'month') {
    groupStartDate = startOf(hoverDate, 'month');
    groupEndDate = endOf(hoverDate, 'month');
  } else {
    // week
    groupStartDate = startOf(hoverDate, 'week');
    groupEndDate = endOf(hoverDate, 'week');
  }

  // Check if group intersects with calendar range
  const calendarEndDate = addDuration(startDate, numberOfCells - 1, 'day');
  if (isBefore(groupEndDate, startDate) || isAfter(groupStartDate, calendarEndDate)) {
    return null;
  }

  // Clamp to calendar range
  const clampedStartDate = isBefore(groupStartDate, startDate) ? startDate : groupStartDate;
  const clampedEndDate = isAfter(groupEndDate, calendarEndDate)
    ? calendarEndDate
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
      minX: startPos.x - OUTLINE_CELL_PADDING,
      minY: startPos.y - OUTLINE_CELL_PADDING,
      maxX: endPos.x + calendarStyle.cellWidth + OUTLINE_CELL_PADDING,
      maxY: endPos.y + calendarStyle.cellHeight + OUTLINE_CELL_PADDING,
      row: startPos.row,
    });
  } else {
    // Multiple rows
    // First row: from startPos to end of row
    const lastCellFirstRow = getCellPosition(startPos.row * dimensions.numberOfCols + dimensions.numberOfCols - 1, dimensions, calendarStyle);
    bounds.push({
      minX: startPos.x - OUTLINE_CELL_PADDING,
      minY: startPos.y - OUTLINE_CELL_PADDING,
      maxX: lastCellFirstRow.x + calendarStyle.cellWidth + OUTLINE_CELL_PADDING,
      maxY: startPos.y + calendarStyle.cellHeight + OUTLINE_CELL_PADDING,
      row: startPos.row,
    });

    // Intermediate rows: full width
    for (let row = startPos.row + 1; row < endPos.row; row++) {
      const firstCellOfRow = getCellPosition(row * dimensions.numberOfCols, dimensions, calendarStyle);
      const lastCellOfRow = getCellPosition(row * dimensions.numberOfCols + dimensions.numberOfCols - 1, dimensions, calendarStyle);
      bounds.push({
        minX: firstCellOfRow.x - OUTLINE_CELL_PADDING,
        minY: firstCellOfRow.y - OUTLINE_CELL_PADDING,
        maxX: lastCellOfRow.x + calendarStyle.cellWidth + OUTLINE_CELL_PADDING,
        maxY: firstCellOfRow.y + calendarStyle.cellHeight + OUTLINE_CELL_PADDING,
        row,
      });
    }

    // Last row: from start of row to endPos
    const firstCellLastRow = getCellPosition(endPos.row * dimensions.numberOfCols, dimensions, calendarStyle);
    bounds.push({
      minX: firstCellLastRow.x - OUTLINE_CELL_PADDING,
      minY: endPos.y - OUTLINE_CELL_PADDING,
      maxX: endPos.x + calendarStyle.cellWidth + OUTLINE_CELL_PADDING,
      maxY: endPos.y + calendarStyle.cellHeight + OUTLINE_CELL_PADDING,
      row: endPos.row,
    });
  }

  return bounds;
};

export const getDayOutlineBounds = (
  cellIndex: number,
  numberOfCells: number,
  gridWidth: number,
  calendarStyle: CalendarStyle,
): OutlineBounds | null => {
  if (cellIndex < 0 || cellIndex >= numberOfCells) {
    return null;
  }

  const dimensions = calculateCalendarDimension(calendarStyle, { numberOfCells, canvasWidth: gridWidth });
  const cellPos = getCellPosition(cellIndex, dimensions, calendarStyle);

  return {
    minX: cellPos.x - OUTLINE_CELL_PADDING,
    minY: cellPos.y - OUTLINE_CELL_PADDING,
    maxX: cellPos.x + calendarStyle.cellWidth + OUTLINE_CELL_PADDING,
    maxY: cellPos.y + calendarStyle.cellHeight + OUTLINE_CELL_PADDING,
  };
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
  unit: 'year' | 'month' | 'week' = 'month',
) => {
  if (bounds.length === 0) return;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;

  if (unit === 'year') {
    // For year: draw a continuous outline that respects cell boundaries without internal borders
    ctx.beginPath();

    // Start from top-left of first bound
    ctx.moveTo(bounds[0].minX, bounds[0].minY);

    // Trace top edge of first row
    ctx.lineTo(bounds[0].maxX, bounds[0].minY);

    // Trace right edges and handle transitions
    for (let i = 0; i < bounds.length; i++) {
      const current = bounds[i];
      const next = bounds[i + 1];

      // Right edge down to bottom of current row
      ctx.lineTo(current.maxX, current.maxY);

      // Handle transition to next row
      if (next) {
        // If next row's right edge is different, create a step
        if (next.maxX !== current.maxX) {
          ctx.lineTo(next.maxX, current.maxY);
        }
      }
    }

    // Trace bottom edge of last row (going left)
    const lastBound = bounds[bounds.length - 1];
    ctx.lineTo(lastBound.minX, lastBound.maxY);

    // Trace left edges going back up, handling transitions
    for (let i = bounds.length - 1; i >= 0; i--) {
      const current = bounds[i];
      const prev = bounds[i - 1];

      // Left edge up to top of current row
      ctx.lineTo(current.minX, current.minY);

      // Handle transition to previous row
      if (prev && prev.minX !== current.minX) {
        ctx.lineTo(prev.minX, current.minY);
      }
    }

    ctx.closePath();
    ctx.stroke();
  } else {
    // For month/week: draw separate outlines for each row segment (no connecting lines)
    bounds.forEach((bound) => {
      ctx.strokeRect(bound.minX, bound.minY, bound.maxX - bound.minX, bound.maxY - bound.minY);
    });
  }

  ctx.restore();
};

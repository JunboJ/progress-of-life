import { CalendarStyle } from "./style";

export const calculateCanvasDimensions = (
	calendarStyle: CalendarStyle,
	{ numberOfCells, gridWidth }: { numberOfCells: number; gridWidth: number }
) => {
	const dimensions = calculateCalendarDimension(calendarStyle, {
		numberOfCells,
		canvasWidth: gridWidth,
	});

	const totalRows = dimensions.numberOfRows + (dimensions.daysOfLastRow > 0 ? 1 : 0);
	const canvasHeight =
		calendarStyle.paddingTop +
		totalRows * calendarStyle.cellHeight +
		(totalRows - 1) * calendarStyle.cellGap +
		calendarStyle.paddingBottom;

	return {
		canvasWidth: gridWidth,
		canvasHeight,
		numberOfCols: dimensions.numberOfCols,
		numberOfRows: dimensions.numberOfRows,
		daysOfLastRow: dimensions.daysOfLastRow,
	};
};

export const calculateCalendarDimension = (
	calendarStyle: CalendarStyle,
	{ numberOfCells, canvasWidth }: { numberOfCells: number; canvasWidth: number }
) => {
	const numberOfCols = Math.floor(
		(canvasWidth - calendarStyle.paddingLeft - calendarStyle.paddingRight - calendarStyle.cellGap) /
			(calendarStyle.cellWidth + calendarStyle.cellGap)
	);
	const computedExtraPaddingHorizontal = Math.floor(
		(canvasWidth - calendarStyle.paddingLeft - calendarStyle.paddingRight - calendarStyle.cellGap) %
			(calendarStyle.cellWidth + calendarStyle.cellGap)
	);
	const computedPaddingLeft = computedExtraPaddingHorizontal / 2 + calendarStyle.paddingLeft;
	const numberOfRows = Math.floor(numberOfCells / numberOfCols);
	const daysOfLastRow = numberOfCells % numberOfCols;

	return {
		numberOfCells,
		numberOfCols,
		computedExtraPaddingHorizontal,
		computedPaddingLeft,
		numberOfRows,
		daysOfLastRow,
	};
};

export interface CalendarCellPosition {
	cellIndex: number;
	row: number;
	col: number;
}

export const getCalendarCellFromPoint = (
	calendarStyle: CalendarStyle,
	{
		numberOfCells,
		canvasWidth,
		pointX,
		pointY,
	}: {
		numberOfCells: number;
		canvasWidth: number;
		pointX: number;
		pointY: number;
	}
): CalendarCellPosition | null => {
	const { numberOfCols, computedPaddingLeft, numberOfRows, daysOfLastRow } = calculateCalendarDimension(
		calendarStyle,
		{
			numberOfCells,
			canvasWidth,
		}
	);

	const cellWidth = calendarStyle.cellWidth;
	const cellHeight = calendarStyle.cellHeight;
	const cellGap = calendarStyle.cellGap;
	const halfGap = cellGap / 2;
	const offsetX = pointX - computedPaddingLeft;
	const offsetY = pointY - calendarStyle.paddingTop;

	if (offsetX < -halfGap || offsetY < -halfGap) {
		return null;
	}

	const row = Math.floor((offsetY + halfGap) / (cellHeight + cellGap));
	const col = Math.floor((offsetX + halfGap) / (cellWidth + cellGap));

	const totalRows = numberOfRows + (daysOfLastRow > 0 ? 1 : 0);
	if (row >= totalRows) {
		return null;
	}

	const columnsInRow = row === numberOfRows && daysOfLastRow > 0 ? daysOfLastRow : numberOfCols;
	if (col >= columnsInRow) {
		return null;
	}

	const cellIndex = row * numberOfCols + col;
	if (cellIndex >= numberOfCells) {
		return null;
	}

	return { cellIndex, row, col };
};

export const calculateTableGridDimensions = (
	cellSize: number,
	gap: number,
	containerWidth: number,
	numberOfCells: number
) => {
	const numOfCols = Math.floor((containerWidth - gap) / (cellSize + gap));
	const remainOfLastRow = numberOfCells % numOfCols;
	const numOfRows = remainOfLastRow === 0 ? numberOfCells / numOfCols : Math.floor(numberOfCells / numOfCols) + 1;

	const isLastRowWithRemain = (rowIndex: number) => rowIndex === numOfRows - 1 && remainOfLastRow !== 0;
	const getNumOfCols = (rowIndex: number) => (isLastRowWithRemain(rowIndex) ? remainOfLastRow : numOfCols);

	return {
		numOfCols,
		numOfRows,
		remainOfLastRow,
		isLastRowWithRemain,
		getNumOfCols,
	};
};

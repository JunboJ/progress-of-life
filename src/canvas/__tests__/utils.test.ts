import { describe, expect, it } from "vitest";
import { calculateTableGridDimensions, getCalendarCellFromPoint } from "../../canvas/utils";
import { CalendarStyle } from "../../canvas/style";

describe("calculateTableGridDimensions", () => {
	it("calculates grid layout correctly for a fixed container and cell size", () => {
		const result = calculateTableGridDimensions(10, 3, 100, 20);

		expect(result.numOfCols).toBe(7);
		expect(result.numOfRows).toBe(3);
		expect(result.getNumOfCols(0)).toBe(7);
		expect(result.getNumOfCols(2)).toBe(6);
	});
});

describe("getCalendarCellFromPoint", () => {
	it("returns the correct cell index for a point inside the first cell", () => {
		const cell = getCalendarCellFromPoint(CalendarStyle, {
			numberOfCells: 10,
			canvasWidth: 200,
			pointX: 30,
			pointY: 30,
		});

		expect(cell).toEqual({ cellIndex: 0, row: 0, col: 0 });
	});

	it("returns null for points outside any cell", () => {
		const cell = getCalendarCellFromPoint(CalendarStyle, {
			numberOfCells: 10,
			canvasWidth: 200,
			pointX: 0,
			pointY: 0,
		});

		expect(cell).toBeNull();
	});
});

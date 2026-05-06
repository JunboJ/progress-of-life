import { describe, expect, it } from "vitest";
import { calculateLifeStats } from "../lifeCalculations";
import { parseDate, now, diffDates, formatDate, isSame, addDuration } from "../date";

describe("calculateLifeStats", () => {
	it("returns correct start and end dates for a given DOB and lifespan", () => {
		const result = calculateLifeStats(80, "1995-02-14");

		expect(formatDate(result.startDate, "YYYY-MM-DD")).toBe("1995-02-14");
		expect(formatDate(result.endDate, "YYYY-MM-DD")).toBe("2075-02-14");
		expect(result.months).toBe(960);
		expect(result.days).toBe(diffDates(parseDate("2075-02-14"), parseDate("1995-02-14"), "d"));
		expect(result.daysLived).toBe(diffDates(now(), parseDate("1995-02-14"), "d"));
	});

	it("uses today when dob is empty", () => {
		const result = calculateLifeStats(80, "");

		expect(isSame(result.startDate, result.today, "day")).toBe(true);
		expect(isSame(result.endDate, addDuration(result.today, 80, "year"), "day")).toBe(true);
		expect(result.days).toBe(diffDates(result.endDate, result.startDate, "d"));
	});
});

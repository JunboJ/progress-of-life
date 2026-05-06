/**
 * Date abstraction layer.
 *
 * All date operations in this project go through the functions below.
 * No other file should import directly from 'dayjs' (or any other date library).
 * To swap the underlying library, replace only this file.
 */

import dayjs, { Dayjs } from "dayjs";
import isSameOrAfterPlugin from "dayjs/plugin/isSameOrAfter";

dayjs.extend(isSameOrAfterPlugin);

/**
 * Opaque date object. Pass it only to functions in this module —
 * do not call library methods on it directly.
 */
export type DateObj = Dayjs;

/** Units for arithmetic (add) and diff operations. */
export type DateUnit = "year" | "y" | "month" | "M" | "week" | "w" | "day" | "d";

/** Units for startOf / endOf boundary operations. */
export type DateBoundaryUnit = "year" | "month" | "week" | "day";

/** Returns the current date/time. */
export function now(): DateObj {
	return dayjs();
}

/** Parses a date string (ISO 8601 / YYYY-MM-DD). */
export function parseDate(s: string): DateObj {
	return dayjs(s);
}

/** Returns a new date offset from `date` by `amount` of `unit`. */
export function addDuration(date: DateObj, amount: number, unit: DateUnit): DateObj {
	return date.add(amount, unit as dayjs.ManipulateType);
}

/**
 * Returns the signed difference between two dates in the given `unit`.
 * Positive when `a` is after `b` (mirrors `a.diff(b, unit)`).
 */
export function diffDates(a: DateObj, b: DateObj, unit: DateUnit): number {
	return a.diff(b, unit as dayjs.OpUnitType);
}

/** Formats a date to a string using a dayjs-compatible format pattern. */
export function formatDate(date: DateObj, format: string): string {
	return date.format(format);
}

/** Returns true if `a` is strictly after `b`, optionally at `unit` granularity. */
export function isAfter(a: DateObj, b: DateObj, unit?: DateBoundaryUnit): boolean {
	return a.isAfter(b, unit);
}

/** Returns true if `a` is strictly before `b`. */
export function isBefore(a: DateObj, b: DateObj): boolean {
	return a.isBefore(b);
}

/** Returns true if `a` and `b` represent the same point in time at `unit` granularity. */
export function isSame(a: DateObj, b: DateObj, unit?: DateBoundaryUnit): boolean {
	return a.isSame(b, unit);
}

/** Returns true if `a` is the same as, or after, `b`. */
export function isSameOrAfter(a: DateObj, b: DateObj): boolean {
	return a.isSameOrAfter(b);
}

/** Returns a date snapped to the start of the given `unit` period. */
export function startOf(date: DateObj, unit: DateBoundaryUnit): DateObj {
	return date.startOf(unit);
}

/** Returns a date snapped to the end of the given `unit` period. */
export function endOf(date: DateObj, unit: DateBoundaryUnit): DateObj {
	return date.endOf(unit);
}

import { useState } from "react";
import { COLOR_CELL_ACTIVE, COLOR_CELL_INACTIVE } from "../../canvas/constants";
import { useDateModalStore } from "../../store/dateModalStore";
import { Modal } from "../shared/Modal";
import { parseDate, diffDates, addDuration, isBefore, isSame, now } from "../../utils/date";
import "./DateModal.css";

function getDateInfo(date: string, startDate: string): { relative: string; age: string } | null {
	if (!startDate || !date) return null;
	const d = parseDate(date);
	const s = parseDate(startDate);
	const years = diffDates(d, s, "year");
	const afterYears = addDuration(s, years, "year");
	const months = diffDates(d, afterYears, "M");
	const remainingDays = diffDates(d, addDuration(afterYears, months, "M"), "day");
	const parts: string[] = [];
	if (years > 0) parts.push(`${years} year${years !== 1 ? "s" : ""}`);
	if (months > 0) parts.push(`${months} month${months !== 1 ? "s" : ""}`);
	if (remainingDays > 0) parts.push(`${remainingDays} day${remainingDays !== 1 ? "s" : ""}`);
	const suffix = isBefore(d, now()) ? "have passed" : "from now";
	const relative = parts.length ? `${parts.join(", ")} ${suffix}` : "the day it all began";
	const age = years > 0 ? `you are at the age of ${years}` : "in the first year";
	return { relative, age };
}

export const DateModal = () => {
	const open = useDateModalStore((s) => s.open);
	const date = useDateModalStore((s) => s.date);
	const width = useDateModalStore((s) => s.width);
	const height = useDateModalStore((s) => s.height);
	const isActive = useDateModalStore((s) => s.isActive);
	const startDate = useDateModalStore((s) => s.startDate);
	const closeModal = useDateModalStore((s) => s.closeModal);

	const [text, setText] = useState("");

	const today = now();
	const d = parseDate(date);
	const placeholder = isSame(d, today, "day")
		? "The present moment, alive and unwritten…"
		: isBefore(d, today)
			? "What did this day hold? What did it leave behind?"
			: "A day yet to arrive. What do you dream it will bring?";

	return (
		<Modal
			open={open}
			onClose={closeModal}
			width={width}
			height={height}
			backgroundColor={isActive ? COLOR_CELL_ACTIVE : COLOR_CELL_INACTIVE}
			variant="cell"
		>
			<div className="data-modal-header">
				<div className="date-modal-date">{date}</div>
				{(() => {
					const info = getDateInfo(date, startDate);
					return info ? (
						<p className="date-modal-meta">
							{info.relative} · {info.age}
						</p>
					) : null;
				})()}
			</div>
			<textarea
				className="date-modal-textarea"
				value={text}
				onChange={(e) => setText(e.target.value)}
				placeholder={placeholder}
			/>
		</Modal>
	);
};

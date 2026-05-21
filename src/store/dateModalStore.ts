import { create } from "zustand";
import { CalendarCellPosition } from "../canvas/utils";

export interface DateModalState {
	open: boolean;
	date: string;
	width?: number;
	height?: number;
	isActive?: boolean;
	calendarCellPosition?: CalendarCellPosition;
	openModal: (
		date: string,
		options: { width: number; height: number; isActive: boolean; calendarCellPosition?: CalendarCellPosition }
	) => void;
	closeModal: () => void;
}

export const useDateModalStore = create<DateModalState>()((set) => ({
	open: false,
	date: "",
	width: undefined,
	height: undefined,
	isActive: undefined,
	calendarCellPosition: undefined,
	openModal: (date, options) =>
		set({
			open: true,
			date,
			width: options.width,
			height: options.height,
			isActive: options.isActive,
			calendarCellPosition: options.calendarCellPosition,
		}),
	closeModal: () => set({ open: false, width: undefined, height: undefined, isActive: undefined }),
	clearCalendarCellPosition: () => set({ calendarCellPosition: undefined }),
}));

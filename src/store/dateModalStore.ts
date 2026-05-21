import { create } from "zustand";

interface DateModalState {
	open: boolean;
	date: string;
	width?: number;
	height?: number;
	isActive?: boolean;
	openModal: (date: string, options: { width: number; height: number; isActive: boolean }) => void;
	closeModal: () => void;
}

export const useDateModalStore = create<DateModalState>()((set) => ({
	open: false,
	date: "",
	width: undefined,
	height: undefined,
	isActive: undefined,
	openModal: (date, options) =>
		set({ open: true, date, width: options.width, height: options.height, isActive: options.isActive }),
	closeModal: () => set({ open: false, width: undefined, height: undefined, isActive: undefined }),
}));

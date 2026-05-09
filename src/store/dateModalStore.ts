import { create } from "zustand";

interface DateModalState {
	open: boolean;
	date: string;
	openModal: (date: string) => void;
	closeModal: () => void;
}

export const useDateModalStore = create<DateModalState>()((set) => ({
	open: false,
	date: "",
	openModal: (date) => set({ open: true, date }),
	closeModal: () => set({ open: false }),
}));

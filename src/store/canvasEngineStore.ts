import { create } from "zustand";
import { DateObj } from "../utils/date";

interface CanvasEngineState {
	hoveredDate: DateObj | null;
	setHoveredDate: (date: DateObj | null) => void;
}

export const useCanvasEngineStore = create<CanvasEngineState>()((set) => ({
	hoveredDate: null,
	setHoveredDate: (date) => set((state) => (state.hoveredDate === date ? state : { hoveredDate: date })),
}));

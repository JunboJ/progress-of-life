import { create } from 'zustand';
import { Dayjs } from 'dayjs';

interface CanvasEngineState {
  hoveredDate: Dayjs | null;
  setHoveredDate: (date: Dayjs | null) => void;
}

export const useCanvasEngineStore = create<CanvasEngineState>()((set) => ({
  hoveredDate: null,
  setHoveredDate: (date) =>
    set((state) => (state.hoveredDate === date ? state : { hoveredDate: date })),
}));

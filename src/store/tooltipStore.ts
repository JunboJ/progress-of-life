import { create } from "zustand";

interface TooltipState {
  positionX: number;
  positionY: number;
  hidden: boolean;
  content: string;
  showTooltip: (x: number, y: number, content: string) => void;
  updatePosition: (x: number, y: number) => void;
  updatePositionX: (x: number) => void;
  updatePositionY: (y: number) => void;
  setHidden: (isHidden: boolean) => void;
  setContent: (content: string) => void;
}

export const useTooltipStore = create<TooltipState>()((set) => ({
  positionX: 0,
  positionY: 0,
  hidden: true,
  content: "",
  showTooltip: (x, y, content) => set((state) => {
    if (state.positionX === x && state.positionY === y && state.content === content && !state.hidden) {
      return state;
    }

    return { positionX: x, positionY: y, content, hidden: false };
  }),
  updatePosition: (x, y) => set((state) => {
    if (state.positionX === x && state.positionY === y) {
      return state;
    }

    return { positionX: x, positionY: y };
  }),
  updatePositionX: (x) => set(() => ({ positionX: x })),
  updatePositionY: (y) => set(() => ({ positionY: y })),
  setHidden: (isHidden) => set((state) => (state.hidden === isHidden ? state : { hidden: isHidden })),
  setContent: (content) => set((state) => (state.content === content ? state : { content })),
}));

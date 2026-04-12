import { create } from "zustand";

interface TooltipState {
  positionX: number;
  positionY: number;
  hidden: boolean;
  content: string;
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
  updatePositionX: (x) => set(() => ({ positionX: x })),
  updatePositionY: (y) => set(() => ({ positionY: y })),
  setHidden: (isHidden) => set(() => ({ hidden: isHidden })),
  setContent: (content) => set(() => ({ content })),
}));

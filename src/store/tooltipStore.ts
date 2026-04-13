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
  showTooltip: (x, y, content) => set(() => ({ positionX: x, positionY: y, content, hidden: false })),
  updatePosition: (x, y) => set(() => ({ positionX: x, positionY: y })),
  updatePositionX: (x) => set(() => ({ positionX: x })),
  updatePositionY: (y) => set(() => ({ positionY: y })),
  setHidden: (isHidden) => set(() => ({ hidden: isHidden })),
  setContent: (content) => set(() => ({ content })),
}));

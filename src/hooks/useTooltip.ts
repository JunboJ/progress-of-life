import { useTooltipStore } from '../store/tooltipStore';

export const useTooltip = () => {
  const showTooltipState = useTooltipStore((state) => state.showTooltip);
  const updatePosition = useTooltipStore((state) => state.updatePosition);
  const setHidden = useTooltipStore((state) => state.setHidden);
  const setContent = useTooltipStore((state) => state.setContent);

  const showTooltip = (x: number, y: number, content: string) => {
    showTooltipState(x, y, content);
  };

  const hideTooltip = () => {
    setHidden(true);
  };

  const updateTooltipPosition = (x: number, y: number) => {
    updatePosition(x, y);
  };

  return {
    showTooltip,
    hideTooltip,
    updateTooltipPosition,
    setContent,
  };
};
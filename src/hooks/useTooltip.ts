import { useTooltipStore } from '../store/tooltipStore';

export const useTooltip = () => {
  const updatePositionX = useTooltipStore((state) => state.updatePositionX);
  const updatePositionY = useTooltipStore((state) => state.updatePositionY);
  const setHidden = useTooltipStore((state) => state.setHidden);
  const setContent = useTooltipStore((state) => state.setContent);

  const showTooltip = (x: number, y: number, content: string) => {
    updatePositionX(x);
    updatePositionY(y);
    setContent(content);
    setHidden(false);
  };

  const hideTooltip = () => {
    setHidden(true);
  };

  const updateTooltipPosition = (x: number, y: number) => {
    updatePositionX(x);
    updatePositionY(y);
  };

  return {
    showTooltip,
    hideTooltip,
    updateTooltipPosition,
    setContent,
  };
};
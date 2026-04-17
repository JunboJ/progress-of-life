import { useTooltipStore } from "../../store/tooltipStore";
import { calculateTooltipPosition } from "../../utils/tooltipPosition";
import styles from "./CellTooltip.module.css";

const CellTooltipConfig = {
  size: {
    width: 80,
    height: 45,
  },
};

export const CellTooltip = () => {
  const positionX = useTooltipStore((state) => state.positionX);
  const positionY = useTooltipStore((state) => state.positionY);
  const hidden = useTooltipStore((state) => state.hidden);
  const content = useTooltipStore((state) => state.content);

  const { x: calculatedPositionX, y: calculatedPositionY } = calculateTooltipPosition(
    positionX + 16,
    positionY + 16,
    CellTooltipConfig.size
  );

  return (
    <div
      className={`${styles.cellTooltip} ${hidden ? styles.cellTooltipHidden : ""}`}
      style={{
        width: CellTooltipConfig.size.width,
        height: CellTooltipConfig.size.height,
        transform: `translate3d(${calculatedPositionX}px, ${calculatedPositionY}px, 0)`,
      }}
    >
      <span>{content}</span>
    </div>
  );
};

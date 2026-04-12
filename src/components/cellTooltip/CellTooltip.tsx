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
  const positionX = useTooltipStore((state) => state.positionX) + 16;
  const positionY = useTooltipStore((state) => state.positionY) + 16;
  const hidden = useTooltipStore((state) => state.hidden);
  const content = useTooltipStore((state) => state.content);

  console.log('CellTooltip render:', { positionX, positionY, hidden, content })

  const { x: calculatedPositionX, y: calculatedPositionY } = calculateTooltipPosition(
    positionX,
    positionY,
    CellTooltipConfig.size
  );

  return (
    <div
      className={`${styles.cellTooltip} ${hidden ? styles.cellTooltipHidden : ""}`}
      style={{
        top: calculatedPositionY,
        left: calculatedPositionX,
        width: CellTooltipConfig.size.width,
        height: CellTooltipConfig.size.height,
      }}
    >
      <span>{content}</span>
    </div>
  );
};

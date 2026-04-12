import { useTooltipStore } from "../../store/tooltipStore";
import styles from "./CellTooltip.module.css";

const CellTooltipConfig = {
  size: {
    width: 80,
    height: 45,
  },
};

export const CellTooltip = () => {
  const clientWidth = document.body.clientWidth;
  const scrollbarWidth = window.innerWidth - document.body.clientWidth;

  const positionX = useTooltipStore((state) => state.positionX) + 16;
  const positionY = useTooltipStore((state) => state.positionY) + 16;
  const hidden = useTooltipStore((state) => state.hidden);
  const content = useTooltipStore((state) => state.content);

  console.log('CellTooltip render:', { positionX, positionY, hidden, content })

  const calculatedPositionX =
    positionX + CellTooltipConfig.size.width > clientWidth - 16
      ? clientWidth - CellTooltipConfig.size.width - scrollbarWidth
      : positionX;
  const calculatedPositionY =
    positionY + CellTooltipConfig.size.height > window.innerHeight
      ? window.innerHeight - CellTooltipConfig.size.height
      : positionY;

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

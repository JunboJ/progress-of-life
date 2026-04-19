import { Dayjs } from "dayjs";
import { useTooltipStore } from "../../store/tooltipStore";
import { calculateTableGridDimensions } from "../../canvas/utils";

const cellConfig = {
  sizes: {
    default: {
      size: 10,
      className: "size-default",
    },
    mid: {
      size: 16,
      className: "size-mid",
    },
  },
};

export const ProgressGridTable = ({
  startDate,
  today,
  days,
  collapseGridGap = false,
}: {
  days: number;
  startDate: Dayjs;
  today: Dayjs;
  collapseGridGap?: boolean;
}) => {
  const showTooltip = useTooltipStore((s) => s.showTooltip);
  const setHidden = useTooltipStore((s) => s.setHidden);
  const updatePosition = useTooltipStore((s) => s.updatePosition);
  const hideTooltip = () => setHidden(true);
  const updateTooltipPosition = (x: number, y: number) => updatePosition(x, y);
  const gap = collapseGridGap ? 0 : 3;

  const { numOfCols, numOfRows, getNumOfCols } = calculateTableGridDimensions(
    cellConfig.sizes.default.size,
    gap,
    window.innerWidth - (cellConfig.sizes.default.size + gap),
    days
  );
  return (
    <table
      className="progress-table"
      style={{ borderSpacing: gap }}
      onMouseEnter={() => {
        // Tooltip is shown on hover over cells
      }}
      onMouseLeave={() => {
        hideTooltip();
      }}
      onMouseMove={(e) => {
        updateTooltipPosition(e.clientX, e.clientY);
      }}
    >
      <tbody>
        {Array(Math.floor(numOfRows))
          .fill(0)
          .map((_, ri) => {
            return (
              <tr key={`row-${ri}`}>
                {Array(getNumOfCols(ri))
                  .fill(0)
                  .map((_, di) => {
                    const currentDate = startDate.add(
                      ri * numOfCols + di,
                      "day",
                    );
                    return (
                      <td
                        key={`row-${ri}-data-${di}`}
                        data-tooltip-content={currentDate.format("YYYY-MM-DD")}
                        data-index-of-year={
                          currentDate.isSameOrAfter(today)
                            ? -1
                            : currentDate.diff(startDate, "y") % 10
                        }
                        className={`cell ${cellConfig.sizes.mid.className}`}
                        onMouseEnter={(e) => {
                          showTooltip(
                            e.clientX,
                            e.clientY,
                            (e.target as HTMLTableCellElement).dataset?.tooltipContent ?? "",
                          );
                        }}
                      ></td>
                    );
                  })}
              </tr>
            );
          })}
      </tbody>
    </table>
  );
};

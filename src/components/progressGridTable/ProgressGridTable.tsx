import { Dayjs } from "dayjs";
import { useTooltip } from "../../hooks/useTooltip";
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
}: {
  days: number;
  startDate: Dayjs;
  today: Dayjs;
}) => {
  const { showTooltip, hideTooltip, updateTooltipPosition } = useTooltip();

  const { numOfCols, numOfRows, getNumOfCols } = calculateTableGridDimensions(
    cellConfig.sizes.default.size,
    3,
    window.innerWidth - (cellConfig.sizes.default.size + 6),
    days
  );
  return (
    <table
      className="progress-table"
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

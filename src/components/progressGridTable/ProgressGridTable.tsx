import { Dayjs } from "dayjs";
import { useTooltipStore } from "../../store/tooltipStore";

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
  endDate,
  today,
  days,
}: {
  days: number;
  startDate: Dayjs;
  endDate: Dayjs;
  today: Dayjs;
}) => {
  const updatePositionY = useTooltipStore((state) => state.updatePositionY);
  const updatePositionX = useTooltipStore((state) => state.updatePositionX);
  const setHidden = useTooltipStore((state) => state.setHidden);
  const setContent = useTooltipStore((state) => state.setContent);

  const numOfCols = Math.floor(
    (window.innerWidth - (cellConfig.sizes.default.size + 6)) /
      (cellConfig.sizes.default.size + 3),
  );
  const remainOfLastRow = days % numOfCols;
  const numOfRows =
    remainOfLastRow === 0 ? days / numOfCols : Math.floor(days / numOfCols) + 1;

  const isLastRowWithRemain = (rowIndex: number) =>
    rowIndex === numOfRows - 1 && remainOfLastRow !== 0;
  const getNumOfCols = (rowIndex: number) =>
    isLastRowWithRemain(rowIndex) ? remainOfLastRow : numOfCols;
  return (
    <table
      className="progress-table"
      onMouseEnter={() => {
        setHidden(false);
      }}
      onMouseLeave={() => {
        setHidden(true);
      }}
      onMouseMove={(e) => {
        updatePositionX(e.clientX);
        updatePositionY(e.clientY);
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
                          setContent(
                            (e.target as HTMLTableCellElement).dataset
                              ?.tooltipContent ?? "",
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

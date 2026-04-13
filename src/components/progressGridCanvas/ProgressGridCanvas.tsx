import { Dayjs } from 'dayjs';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useHtmlClientDimension } from '../../hooks/utils/useHtmlClientWidth';
import { paintCanvas } from '../../canvas/paint';
import { useTooltip } from '../../hooks/useTooltip';
import { useCanvasInteraction } from '../../hooks/useCanvasInteraction';
import { setupCanvas } from '../../utils/canvasSetup';
import { CalendarStyle } from '../../canvas/style';
import { getCalendarCellFromPoint, calculateCanvasDimensions } from '../../canvas/utils';
import { getDayOutlineBounds, drawOutline, getOutlineBounds, drawMultiRowOutline } from '../../canvas/outlineUtils';

interface ProgressGridCanvasProps {
  days: number;
  startDate: Dayjs;
  endDate: Dayjs;
  today: Dayjs;
  animateHighlight?: boolean;
  collapseGridGap?: boolean;
  onAnimationFinished?: () => void;
  onDateHover?: (date: Dayjs | null) => void;
}

const ProgressGridCanvas: React.FC<ProgressGridCanvasProps> = ({
  startDate,
  days,
  today,
  animateHighlight = false,
  collapseGridGap = false,
  onAnimationFinished,
  onDateHover,
}: ProgressGridCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const unitOverlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const dayOverlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [gridWidth, setGridWidth] = useState(8000);
  const [hoveredDay, setHoveredDay] = useState<Dayjs | null>(null);
  const { htmlClientWidth, htmlClientHeight } = useHtmlClientDimension();
  const { showTooltip, hideTooltip, updateTooltipPosition } = useTooltip();
  const { offset, scale, setOffset, handlePointerDown, handlePointerMove, handlePointerUp, handleWheel } = useCanvasInteraction(0.3);

  const animationFrameRef = useRef<number | null>(null);
  const currentHighlightRef = useRef(0);
  const lastSetupDimsRef = useRef({ width: -1, height: -1, dpr: -1 });
  const lastUnitOverlaySetupDimsRef = useRef({ width: -1, height: -1, dpr: -1 });
  const lastDayOverlaySetupDimsRef = useRef({ width: -1, height: -1, dpr: -1 });
  const previousUnitDateRef = useRef<Dayjs | null>(null);
  const hoveredCellIndexRef = useRef<number | null>(null);
  const hoverRafRef = useRef<number | null>(null);
  const pendingPointerRef = useRef<{ x: number; y: number } | null>(null);
  const calendarStyle = useMemo(
    () => ({ ...CalendarStyle, cellGap: collapseGridGap ? 0 : CalendarStyle.cellGap }),
    [collapseGridGap],
  );

  const { canvasWidth, canvasHeight } = calculateCanvasDimensions(calendarStyle, {
    numberOfCells: days,
    gridWidth: gridWidth,
  });

  const dpr = window.devicePixelRatio || 1;

  const passedDaysCount = !startDate.isAfter(today, 'day') ? today.diff(startDate, 'day') + 1 : 0;

  const drawCanvas = (highlightCount: number) => {
    if (!canvasRef.current) {
      return;
    }

    const canvas = canvasRef.current;
    const last = lastSetupDimsRef.current;

    if (last.width !== canvasWidth || last.height !== canvasHeight || last.dpr !== dpr) {
      setupCanvas(canvas, canvasWidth, canvasHeight, dpr);
      lastSetupDimsRef.current = { width: canvasWidth, height: canvasHeight, dpr };
    }

    paintCanvas(canvas, {
      numberOfCells: days,
      canvasWidth: gridWidth,
      startDate,
      today,
      highlightCount,
      calendarStyle,
    });
  };

  useEffect(() => {
    const cancelAnimation = () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };

    if (!animateHighlight) {
      currentHighlightRef.current = passedDaysCount;
      drawCanvas(passedDaysCount);
      cancelAnimation();
      return;
    }

    let startTime: number | null = null;
    const duration = 5000;

    const animate = (timestamp: number) => {
      if (!startTime) {
        startTime = timestamp;
      }

      const elapsed = timestamp - startTime;
      const progress = Math.min(1, elapsed / duration);
      const eased = Math.pow(progress, 1.8);
      const current = Math.min(passedDaysCount, Math.ceil(eased * passedDaysCount));
      currentHighlightRef.current = current;
      drawCanvas(current);

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        animationFrameRef.current = null;
        onAnimationFinished?.();
      }
    };

    cancelAnimation();
    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimation();
    };
  }, [passedDaysCount, animateHighlight, days, canvasWidth, canvasHeight, gridWidth, startDate, today, dpr, onAnimationFinished]);

  const ensureCanvasSetup = (
    canvas: HTMLCanvasElement,
    dimsRef: React.MutableRefObject<{ width: number; height: number; dpr: number }>,
  ) => {
    const last = dimsRef.current;
    if (last.width !== canvasWidth || last.height !== canvasHeight || last.dpr !== dpr) {
      setupCanvas(canvas, canvasWidth, canvasHeight, dpr);
      dimsRef.current = { width: canvasWidth, height: canvasHeight, dpr };
    }
  };

  const drawDayOutline = (date: Dayjs | null) => {
    const canvas = dayOverlayCanvasRef.current;
    if (!canvas) {
      return;
    }

    ensureCanvasSetup(canvas, lastDayOverlaySetupDimsRef);
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    if (!date) {
      return;
    }

    const cellIndex = date.diff(startDate, 'day');
    const dayBounds = getDayOutlineBounds(cellIndex, days, gridWidth, calendarStyle);
    if (dayBounds) {
      drawOutline(ctx, dayBounds, '#FFFFFF', 2);
    }
  };

  const drawUnitOutlines = (date: Dayjs | null, force: boolean = false) => {
    const canvas = unitOverlayCanvasRef.current;
    if (!canvas) {
      return;
    }

    const previousDate = previousUnitDateRef.current;
    const shouldRedraw =
      force ||
      !date ||
      !previousDate ||
      !previousDate.isSame(date, 'week') ||
      !previousDate.isSame(date, 'month') ||
      !previousDate.isSame(date, 'year');

    if (!shouldRedraw) {
      return;
    }

    ensureCanvasSetup(canvas, lastUnitOverlaySetupDimsRef);
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    if (!date) {
      previousUnitDateRef.current = null;
      return;
    }

    const yearBounds = getOutlineBounds(startDate, date, days, gridWidth, 'year', calendarStyle);
    if (yearBounds) {
      drawMultiRowOutline(ctx, yearBounds, '#FF6B6B', 3, 'year');
    }

    const monthBounds = getOutlineBounds(startDate, date, days, gridWidth, 'month', calendarStyle);
    if (monthBounds) {
      drawMultiRowOutline(ctx, monthBounds, '#4ECDC4', 3, 'month');
    }

    const weekBounds = getOutlineBounds(startDate, date, days, gridWidth, 'week', calendarStyle);
    if (weekBounds) {
      drawMultiRowOutline(ctx, weekBounds, '#FFE66D', 3, 'week');
    }

    previousUnitDateRef.current = date;
  };

  const drawOutlinesForDate = (date: Dayjs | null, forceUnitRedraw: boolean = false) => {
    drawDayOutline(date);
    drawUnitOutlines(date, forceUnitRedraw);
  };

  // Center the canvas on first valid viewport dimensions
  // Center the canvas on first render
  useEffect(() => {
    setOffset({
      x: (htmlClientWidth - canvasWidth * 0.3) / 2,
      y: (htmlClientHeight - canvasHeight * 0.3) / 2,
    });
  }, []);

  // Redraw outlines when canvas dimensions change
  useEffect(() => {
    drawOutlinesForDate(hoveredDay, true);
  }, [canvasWidth, canvasHeight, dpr]);

  useEffect(() => {
    return () => {
      if (hoverRafRef.current !== null) {
        cancelAnimationFrame(hoverRafRef.current);
        hoverRafRef.current = null;
      }
    };
  }, []);

  const toCanvasPoint = (clientX: number, clientY: number) => {
    const wrapper = wrapperRef.current;
    if (!wrapper) {
      return null;
    }

    const rect = wrapper.getBoundingClientRect();
    return {
      x: (clientX - rect.left - offset.x) / scale,
      y: (clientY - rect.top - offset.y) / scale,
    };
  };

  const updateHover = (clientX: number, clientY: number) => {
    const point = toCanvasPoint(clientX, clientY);
    if (!point) {
      return;
    }

    const cell = getCalendarCellFromPoint(calendarStyle, {
      numberOfCells: days,
      canvasWidth: gridWidth,
      pointX: point.x,
      pointY: point.y,
    });

    if (cell) {
      if (hoveredCellIndexRef.current === cell.cellIndex) {
        updateTooltipPosition(clientX, clientY);
        return;
      }

      hoveredCellIndexRef.current = cell.cellIndex;
      const currentDate = startDate.add(cell.cellIndex, 'day');
      showTooltip(clientX, clientY, currentDate.format('YYYY-MM-DD'));
      setHoveredDay(currentDate);
      drawOutlinesForDate(currentDate);
      onDateHover?.(currentDate);
    }
    // If no cell found (hovering over gap), keep the previous hover state
  };

  const handlePointerDownWrapper = (event: React.PointerEvent<HTMLDivElement>) => {
    handlePointerDown(event);
  };

  const handlePointerMoveWrapper = (event: React.PointerEvent<HTMLDivElement>) => {
    pendingPointerRef.current = { x: event.clientX, y: event.clientY };
    if (hoverRafRef.current === null) {
      hoverRafRef.current = requestAnimationFrame(() => {
        hoverRafRef.current = null;
        if (!pendingPointerRef.current) {
          return;
        }

        const { x, y } = pendingPointerRef.current;
        pendingPointerRef.current = null;
        updateHover(x, y);
      });
    }
    handlePointerMove(event);
  };

  const handlePointerUpWrapper = (event: React.PointerEvent<HTMLDivElement>) => {
    handlePointerUp(event);
  };

  const handleWheelWrapper = (event: React.WheelEvent<HTMLDivElement>) => {
    handleWheel(event, wrapperRef);
  };

  const handlePointerLeave = () => {
    if (hoverRafRef.current !== null) {
       (hoverRafRef.current);
      hoverRafRef.current = null;
    }
    pendingPointerRef.current = null;
    hideTooltip();
    hoveredCellIndexRef.current = null;
    setHoveredDay(null);
    drawOutlinesForDate(null, true);
    onDateHover?.(null);
  };

  return (
    <div
      ref={wrapperRef}
      style={{
        width: htmlClientWidth,
        height: htmlClientHeight,
        overflow: 'hidden',
        touchAction: 'none',
        backgroundColor: '#23272e',
        position: 'relative',
      }}
      onPointerDown={handlePointerDownWrapper}
      onPointerMove={handlePointerMoveWrapper}
      onPointerUp={handlePointerUpWrapper}
      onPointerCancel={handlePointerUpWrapper}
      onWheel={handleWheelWrapper}
      onPointerLeave={handlePointerLeave}
    >
      <canvas
        ref={canvasRef}
        width={canvasWidth}
        height={canvasHeight}
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
          transformOrigin: '0 0',
          display: 'block',
          imageRendering: 'pixelated',
        }}
      />
      <canvas
        ref={unitOverlayCanvasRef}
        width={canvasWidth}
        height={canvasHeight}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
          transformOrigin: '0 0',
          display: 'block',
          imageRendering: 'pixelated',
          pointerEvents: 'none',
        }}
      />
      <canvas
        ref={dayOverlayCanvasRef}
        width={canvasWidth}
        height={canvasHeight}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
          transformOrigin: '0 0',
          display: 'block',
          imageRendering: 'pixelated',
          pointerEvents: 'none',
        }}
      />
      <input
        type="range"
        min="1000"
        max="10000"
        step="100"
        value={gridWidth}
        onChange={(e) => setGridWidth(Number(e.target.value))}
        style={{
          position: 'absolute',
          bottom: 16,
          right: 16,
          width: 200,
          cursor: 'pointer',
        }}
        title={`Grid width: ${gridWidth}`}
      />
    </div>
  );
};

export default ProgressGridCanvas;

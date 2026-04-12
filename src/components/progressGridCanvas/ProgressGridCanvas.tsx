import { Dayjs } from 'dayjs';
import React, { useEffect, useRef, useState } from 'react';
import { useHtmlClientDimension } from '../../hooks/utils/useHtmlClientWidth';
import { paintCanvas } from '../../canvas/paint';
import { useTooltipStore } from '../../store/tooltipStore';
import { CalendarStyle } from '../../canvas/style';
import { getCalendarCellFromPoint, calculateCanvasDimensions } from '../../canvas/utils';
import { getOutlineBounds, drawMultiRowOutline } from '../../canvas/outlineUtils';

interface ProgressGridCanvasProps {
  days: number;
  startDate: Dayjs;
  endDate: Dayjs;
  today: Dayjs;
  onDateHover?: (date: Dayjs | null) => void;
}

const ProgressGridCanvas: React.FC<ProgressGridCanvasProps> = ({
  startDate,
  days,
  today,
  onDateHover,
}: ProgressGridCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const dragging = useRef(false);
  const lastPointer = useRef({ x: 0, y: 0 });
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [gridWidth, setGridWidth] = useState(4000);
  const [hoveredDay, setHoveredDay] = useState<Dayjs | null>(null);
  const { htmlClientWidth, htmlClientHeight } = useHtmlClientDimension();
  const updatePositionX = useTooltipStore((state) => state.updatePositionX);
  const updatePositionY = useTooltipStore((state) => state.updatePositionY);
  const setHidden = useTooltipStore((state) => state.setHidden);
  const setContent = useTooltipStore((state) => state.setContent);

  const { canvasWidth, canvasHeight } = calculateCanvasDimensions(CalendarStyle, {
    numberOfCells: days,
    gridWidth: gridWidth,
  });

  const dpr = window.devicePixelRatio || 1;

  useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      canvas.width = canvasWidth * dpr;
      canvas.height = canvasHeight * dpr;
      canvas.style.width = `${canvasWidth}px`;
      canvas.style.height = `${canvasHeight}px`;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
      }

      console.log('Canvas updated:', { gridWidth, days, canvasWidth, canvasHeight, dpr });
      paintCanvas(canvas, { numberOfCells: days, canvasWidth: gridWidth, startDate, today });
    }
  }, [days, canvasWidth, canvasHeight, gridWidth, startDate, today, dpr]);

  useEffect(() => {
    if (overlayCanvasRef.current) {
      const canvas = overlayCanvasRef.current;
      canvas.width = canvasWidth * dpr;
      canvas.height = canvasHeight * dpr;
      canvas.style.width = `${canvasWidth}px`;
      canvas.style.height = `${canvasHeight}px`;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);

        if (hoveredDay) {
          // Draw year outline
          const yearBounds = getOutlineBounds(startDate, hoveredDay, days, gridWidth, 'year');
          if (yearBounds) {
            drawMultiRowOutline(ctx, yearBounds, '#FF6B6B', 3);
          }

          // Draw month outline
          const monthBounds = getOutlineBounds(startDate, hoveredDay, days, gridWidth, 'month');
          if (monthBounds) {
            drawMultiRowOutline(ctx, monthBounds, '#4ECDC4', 3);
          }

          // Draw week outline
          const weekBounds = getOutlineBounds(startDate, hoveredDay, days, gridWidth, 'week');
          if (weekBounds) {
            drawMultiRowOutline(ctx, weekBounds, '#FFE66D', 3);
          }
        }
      }
    }
  }, [hoveredDay, canvasWidth, canvasHeight, days, gridWidth, startDate, dpr]);

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

    const cell = getCalendarCellFromPoint(CalendarStyle, {
      numberOfCells: days,
      canvasWidth: gridWidth,
      pointX: point.x,
      pointY: point.y,
    });

    if (cell) {
      const currentDate = startDate.add(cell.cellIndex, 'day');
      updatePositionX(clientX);
      updatePositionY(clientY);
      setContent(currentDate.format('YYYY-MM-DD'));
      setHidden(false);
      setHoveredDay(currentDate);
      onDateHover?.(currentDate);
    }
    // If no cell found (hovering over gap), keep the previous hover state
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) {
      return;
    }

    dragging.current = true;
    lastPointer.current = { x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    updateHover(event.clientX, event.clientY);

    if (!dragging.current) {
      return;
    }

    const dx = event.clientX - lastPointer.current.x;
    const dy = event.clientY - lastPointer.current.y;
    setOffset((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
    lastPointer.current = { x: event.clientX, y: event.clientY };
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    dragging.current = false;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const handlePointerLeave = () => {
    setHidden(true);
    setHoveredDay(null);
    onDateHover?.(null);
  };

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    if (!wrapperRef.current) {
      return;
    }

    event.preventDefault();
    const previousScale = scale;
    const nextScale = Math.min(3, Math.max(0.1, scale * (event.deltaY > 0 ? 0.9 : 1.1)));
    if (nextScale === previousScale) {
      return;
    }

    const rect = wrapperRef.current.getBoundingClientRect();
    const point = {
      x: (event.clientX - rect.left - offset.x) / previousScale,
      y: (event.clientY - rect.top - offset.y) / previousScale,
    };

    setScale(nextScale);
    setOffset({
      x: event.clientX - rect.left - point.x * nextScale,
      y: event.clientY - rect.top - point.y * nextScale,
    });
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
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onWheel={handleWheel}
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
          imageRendering: 'crisp-edges',
          imageRendering: '-webkit-crisp-edges',
          imageRendering: 'pixelated',
        }}
      />
      <canvas
        ref={overlayCanvasRef}
        width={canvasWidth}
        height={canvasHeight}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
          transformOrigin: '0 0',
          display: 'block',
          imageRendering: 'crisp-edges',
          imageRendering: '-webkit-crisp-edges',
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

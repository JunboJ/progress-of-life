import { Dayjs } from 'dayjs';
import React, { useEffect, useRef, useState } from 'react';
import { useHtmlClientDimension } from '../../hooks/utils/useHtmlClientWidth';
import { paintCanvas } from '../../canvas/paint';
import { useTooltipStore } from '../../store/tooltipStore';
import { CalendarStyle } from '../../canvas/style';
import { getCalendarCellFromPoint } from '../../canvas/utils';

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
  onDateHover,
}: ProgressGridCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const dragging = useRef(false);
  const lastPointer = useRef({ x: 0, y: 0 });
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const { htmlClientWidth, htmlClientHeight } = useHtmlClientDimension();
  const updatePositionX = useTooltipStore((state) => state.updatePositionX);
  const updatePositionY = useTooltipStore((state) => state.updatePositionY);
  const setHidden = useTooltipStore((state) => state.setHidden);
  const setContent = useTooltipStore((state) => state.setContent);

  useEffect(() => {
    if (canvasRef.current) {
      paintCanvas(canvasRef.current, { numberOfCells: days, canvasWidth: htmlClientWidth });
    }
  }, [days, htmlClientWidth, htmlClientHeight]);

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
    const canvas = canvasRef.current;
    const point = toCanvasPoint(clientX, clientY);
    if (!canvas || !point) {
      return;
    }

    const cell = getCalendarCellFromPoint(CalendarStyle, {
      numberOfCells: days,
      canvasWidth: canvas.width,
      pointX: point.x,
      pointY: point.y,
    });

    if (cell) {
      const currentDate = startDate.add(cell.cellIndex, 'day');
      updatePositionX(clientX);
      updatePositionY(clientY);
      setContent(currentDate.format('YYYY-MM-DD'));
      setHidden(false);
      onDateHover?.(currentDate);
      return;
    }

    setHidden(true);
    onDateHover?.(null);
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
    onDateHover?.(null);
  };

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    if (!wrapperRef.current) {
      return;
    }

    event.preventDefault();
    const previousScale = scale;
    const nextScale = Math.min(3, Math.max(0.5, scale * (event.deltaY > 0 ? 0.9 : 1.1)));
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
        width={htmlClientWidth}
        height={htmlClientHeight}
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
          transformOrigin: '0 0',
          width: htmlClientWidth,
          height: htmlClientHeight,
          display: 'block',
        }}
      />
    </div>
  );
};

export default ProgressGridCanvas;

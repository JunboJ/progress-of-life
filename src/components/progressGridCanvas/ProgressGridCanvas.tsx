import { Dayjs } from 'dayjs';
import React, { useEffect, useRef } from 'react';
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
  const { htmlClientWidth, htmlClientHeight } = useHtmlClientDimension();
  const updatePositionX = useTooltipStore((state) => state.updatePositionX);
  const updatePositionY = useTooltipStore((state) => state.updatePositionY);
  const setHidden = useTooltipStore((state) => state.setHidden);
  const setContent = useTooltipStore((state) => state.setContent);

  useEffect(() => {
    if (canvasRef.current) {
      paintCanvas(canvasRef.current, { numberOfCells: days, canvasWidth: htmlClientWidth })
    }
  }, [days, htmlClientWidth, htmlClientHeight])

  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const canvasX = (event.clientX - rect.left) * scaleX
    const canvasY = (event.clientY - rect.top) * scaleY

    const cell = getCalendarCellFromPoint(CalendarStyle, {
      numberOfCells: days,
      canvasWidth: canvas.width,
      pointX: canvasX,
      pointY: canvasY,
    })
    console.log('======= cell', cell, 'canvasX:', canvasX, 'canvasY:', canvasY)
    if (cell) {
      const currentDate = startDate.add(cell.cellIndex, 'day')
      updatePositionX(event.clientX)
      updatePositionY(event.clientY)
      setContent(currentDate.format('YYYY-MM-DD'))
      setHidden(false)
      onDateHover?.(currentDate)
      return
    }

    setHidden(true)
    onDateHover?.(null)
  }

  const handleMouseLeave = () => {
    setHidden(true)
    onDateHover?.(null)
  }

  return (
    <canvas
      ref={canvasRef}
      width={htmlClientWidth}
      height={htmlClientHeight}
      style={{ height: htmlClientHeight, width: htmlClientWidth }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    />
  )
};

export default ProgressGridCanvas;

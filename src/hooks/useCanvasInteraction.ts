import { useRef, useState } from 'react';

export const useCanvasInteraction = (initialScale = 1) => {
  const dragging = useRef(false);
  const lastPointer = useRef({ x: 0, y: 0 });
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(initialScale);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    dragging.current = true;
    lastPointer.current = { x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    const dx = event.clientX - lastPointer.current.x;
    const dy = event.clientY - lastPointer.current.y;
    setOffset((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
    lastPointer.current = { x: event.clientX, y: event.clientY };
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    dragging.current = false;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>, wrapperRef: React.RefObject<HTMLDivElement>) => {
    if (!wrapperRef.current) return;
    event.preventDefault();
    const previousScale = scale;
    const nextScale = Math.min(3, Math.max(0.1, scale * (event.deltaY > 0 ? 0.9 : 1.1)));
    if (nextScale === previousScale) return;

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

  return {
    offset,
    scale,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleWheel,
  };
};
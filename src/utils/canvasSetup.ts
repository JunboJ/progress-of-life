export const setupCanvas = (
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
  dpr: number
) => {
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.scale(dpr, dpr);
  }

  return ctx;
};
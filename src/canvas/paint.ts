import { FillRectOptions } from "./canvas.type"
import { CalendarStyle } from "./style"
import { createGridLayout, getStaticTiles, GridLayout, TILE_SIZE } from './tileCache';

export const paintCell = (ctx: CanvasRenderingContext2D, options: FillRectOptions) => {
  ctx.save()
  ctx.fillStyle = options.backgroundColor ?? "#2d3a4a"
  ctx.fillRect(options.x, options.y, options.w, options.h)
  ctx.restore()
}

const BACKGROUND_COLOR = '#23272e';
const INACTIVE_CELL_COLOR = '#2d3a4a';
const ACTIVE_CELL_COLOR = '#0b3d91';

const drawStaticTiles = (ctx: CanvasRenderingContext2D, layout: GridLayout) => {
  const tiles = getStaticTiles(layout, BACKGROUND_COLOR, INACTIVE_CELL_COLOR);

  for (const tile of tiles) {
    ctx.drawImage(tile.canvas, tile.tileX * TILE_SIZE, tile.tileY * TILE_SIZE, tile.width, tile.height);
  }
};

const drawActiveCells = (ctx: CanvasRenderingContext2D, layout: GridLayout, fromIndex: number, toIndex: number) => {
  const start = Math.max(0, Math.min(fromIndex, layout.totalCells));
  const end = Math.max(0, Math.min(toIndex, layout.totalCells));
  if (end <= start) {
    return;
  }

  ctx.fillStyle = ACTIVE_CELL_COLOR;
  ctx.beginPath();

  for (let i = start; i < end; i++) {
    const row = Math.floor(i / layout.numberOfCols);
    const col = i % layout.numberOfCols;
    const x = layout.computedPaddingLeft + col * layout.colStride;
    const y = layout.paddingTop + row * layout.rowStride;
    ctx.rect(x, y, layout.cellWidth, layout.cellHeight);
  }

  ctx.fill();
};

const clearCanvas = (canvas: HTMLCanvasElement) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
};

export const paintStaticCanvas = (
  canvas: HTMLCanvasElement,
  {
    numberOfCells,
    canvasWidth,
    calendarStyle,
  }: {
    numberOfCells: number;
    canvasWidth: number;
    calendarStyle: CalendarStyle;
  },
) => {
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return;
  }

  clearCanvas(canvas);

  const layout = createGridLayout(numberOfCells, canvasWidth, calendarStyle);
  if (!layout) {
    return;
  }

  drawStaticTiles(ctx, layout);
};

export const paintActiveCanvas = (
  canvas: HTMLCanvasElement,
  {
    numberOfCells,
    canvasWidth,
    highlightCount,
    previousCount,
    calendarStyle,
  }: {
    numberOfCells: number;
    canvasWidth: number;
    highlightCount: number;
    previousCount?: number;
    calendarStyle: CalendarStyle;
  },
) => {
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return;
  }

  const isDelta = previousCount !== undefined && previousCount >= 0 && previousCount <= highlightCount;
  if (!isDelta) {
    clearCanvas(canvas);
  }

  const layout = createGridLayout(numberOfCells, canvasWidth, calendarStyle);
  if (!layout) {
    return;
  }

  const fromIndex = isDelta ? previousCount : 0;
  drawActiveCells(ctx, layout, fromIndex, highlightCount);
};


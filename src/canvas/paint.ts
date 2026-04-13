import { Dayjs } from 'dayjs';
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

const drawActiveCells = (ctx: CanvasRenderingContext2D, layout: GridLayout, activeThreshold: number) => {
  const activeCount = Math.max(0, Math.min(activeThreshold, layout.totalCells));
  if (activeCount === 0) {
    return;
  }

  ctx.fillStyle = ACTIVE_CELL_COLOR;
  ctx.beginPath();

  for (let i = 0; i < activeCount; i++) {
    const row = Math.floor(i / layout.numberOfCols);
    const col = i % layout.numberOfCols;
    const x = layout.computedPaddingLeft + col * layout.colStride;
    const y = layout.paddingTop + row * layout.rowStride;
    ctx.rect(x, y, layout.cellWidth, layout.cellHeight);
  }

  ctx.fill();
};

export const paintCanvas = (
  canvas: HTMLCanvasElement,
  {
    numberOfCells,
    canvasWidth,
    startDate,
    today,
    highlightCount,
    calendarStyle,
  }: {
    numberOfCells: number;
    canvasWidth: number;
    startDate: Dayjs;
    today: Dayjs;
    highlightCount?: number;
    calendarStyle: CalendarStyle;
  },
) => {
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return;
  }

  ctx.reset()

  const layout = createGridLayout(numberOfCells, canvasWidth, calendarStyle);
  if (!layout) {
    return;
  }

  const activeThreshold = highlightCount !== undefined
    ? highlightCount
    : today.diff(startDate, 'day') + 1;

  drawStaticTiles(ctx, layout);
  drawActiveCells(ctx, layout, activeThreshold);
}


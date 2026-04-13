import { CalendarStyle } from './style';
import { calculateCalendarDimension } from './utils';

export const TILE_SIZE = 512;

export interface GridLayout {
  canvasWidth: number;
  canvasHeight: number;
  numberOfCells: number;
  numberOfCols: number;
  totalCells: number;
  computedPaddingLeft: number;
  cellWidth: number;
  cellHeight: number;
  colStride: number;
  rowStride: number;
  paddingTop: number;
}

export interface StaticTile {
  tileX: number;
  tileY: number;
  width: number;
  height: number;
  canvas: HTMLCanvasElement;
}

interface StaticTileCache {
  key: string;
  tiles: StaticTile[];
}

let staticTileCache: StaticTileCache | null = null;

export const createGridLayout = (
  numberOfCells: number,
  canvasWidth: number,
  calendarStyle: CalendarStyle,
): GridLayout | null => {
  const { numberOfCols, computedPaddingLeft, numberOfRows, daysOfLastRow } = calculateCalendarDimension(calendarStyle, {
    numberOfCells,
    canvasWidth,
  });

  if (isNaN(numberOfCells) || isNaN(numberOfCols) || isNaN(numberOfRows) || numberOfCols <= 0) {
    return null;
  }

  const { cellWidth, cellHeight, cellGap, paddingTop } = calendarStyle;
  const colStride = cellWidth + cellGap;
  const rowStride = cellHeight + cellGap;
  const totalCells = numberOfRows * numberOfCols + daysOfLastRow;
  const totalRows = numberOfRows + (daysOfLastRow > 0 ? 1 : 0);
  const canvasHeight =
    calendarStyle.paddingTop +
    totalRows * calendarStyle.cellHeight +
    Math.max(0, totalRows - 1) * calendarStyle.cellGap +
    calendarStyle.paddingBottom;

  return {
    canvasWidth,
    canvasHeight,
    numberOfCells,
    numberOfCols,
    totalCells,
    computedPaddingLeft,
    cellWidth,
    cellHeight,
    colStride,
    rowStride,
    paddingTop,
  };
};

const buildTileCacheKey = (layout: GridLayout, backgroundColor: string, inactiveColor: string): string => {
  return [
    layout.canvasWidth,
    layout.canvasHeight,
    layout.numberOfCells,
    layout.numberOfCols,
    layout.totalCells,
    layout.computedPaddingLeft,
    layout.cellWidth,
    layout.cellHeight,
    layout.colStride,
    layout.rowStride,
    layout.paddingTop,
    backgroundColor,
    inactiveColor,
    TILE_SIZE,
  ].join('|');
};

const fillTileBackground = (ctx: CanvasRenderingContext2D, width: number, height: number, backgroundColor: string) => {
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, width, height);
};

const drawInactiveCellsInTile = (
  ctx: CanvasRenderingContext2D,
  layout: GridLayout,
  tileX: number,
  tileY: number,
  tileWidth: number,
  tileHeight: number,
  inactiveColor: string,
) => {
  const tileLeft = tileX * TILE_SIZE;
  const tileTop = tileY * TILE_SIZE;
  const tileRight = tileLeft + tileWidth;
  const tileBottom = tileTop + tileHeight;

  ctx.fillStyle = inactiveColor;
  ctx.beginPath();

  for (let i = 0; i < layout.totalCells; i++) {
    const row = Math.floor(i / layout.numberOfCols);
    const col = i % layout.numberOfCols;
    const x = layout.computedPaddingLeft + col * layout.colStride;
    const y = layout.paddingTop + row * layout.rowStride;

    if (x + layout.cellWidth <= tileLeft || x >= tileRight || y + layout.cellHeight <= tileTop || y >= tileBottom) {
      continue;
    }

    ctx.rect(x - tileLeft, y - tileTop, layout.cellWidth, layout.cellHeight);
  }

  ctx.fill();
};

const buildStaticTiles = (layout: GridLayout, backgroundColor: string, inactiveColor: string): StaticTile[] => {
  const tileCols = Math.ceil(layout.canvasWidth / TILE_SIZE);
  const tileRows = Math.ceil(layout.canvasHeight / TILE_SIZE);
  const tiles: StaticTile[] = [];

  for (let tileY = 0; tileY < tileRows; tileY++) {
    for (let tileX = 0; tileX < tileCols; tileX++) {
      const width = Math.min(TILE_SIZE, layout.canvasWidth - tileX * TILE_SIZE);
      const height = Math.min(TILE_SIZE, layout.canvasHeight - tileY * TILE_SIZE);
      const tileCanvas = document.createElement('canvas');
      tileCanvas.width = width;
      tileCanvas.height = height;

      const tileCtx = tileCanvas.getContext('2d');
      if (!tileCtx) {
        continue;
      }

      fillTileBackground(tileCtx, width, height, backgroundColor);
      drawInactiveCellsInTile(tileCtx, layout, tileX, tileY, width, height, inactiveColor);

      tiles.push({ tileX, tileY, width, height, canvas: tileCanvas });
    }
  }

  return tiles;
};

export const getStaticTiles = (layout: GridLayout, backgroundColor: string, inactiveColor: string): StaticTile[] => {
  const key = buildTileCacheKey(layout, backgroundColor, inactiveColor);
  if (staticTileCache && staticTileCache.key === key) {
    return staticTileCache.tiles;
  }

  const tiles = buildStaticTiles(layout, backgroundColor, inactiveColor);
  staticTileCache = { key, tiles };
  return tiles;
};

export const clearStaticTileCache = () => {
  staticTileCache = null;
};

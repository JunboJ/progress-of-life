import { CalendarStyle } from './style';
import { calculateCalendarDimension } from './utils';

export const TILE_SIZE = 512;
export const MAX_LOD = 4;

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
  logicalWidth: number;
  logicalHeight: number;
  canvas: HTMLCanvasElement;
}

export interface LODData {
  level: number;
  coverage: number;
  tileCols: number;
  tileRows: number;
  tiles: Map<string, StaticTile>;
}

interface TileCache {
  key: string;
  lods: LODData[];
}

let tileCache: TileCache | null = null;

export const createGridLayout = (
  numberOfCells: number,
  canvasWidth: number,
  calendarStyle: CalendarStyle,
): GridLayout | null => {
  const { numberOfCols, computedPaddingLeft, numberOfRows, daysOfLastRow } =
    calculateCalendarDimension(calendarStyle, { numberOfCells, canvasWidth });

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
    canvasWidth, canvasHeight, numberOfCells, numberOfCols, totalCells,
    computedPaddingLeft, cellWidth, cellHeight, colStride, rowStride, paddingTop,
  };
};

export const pickLODLevel = (scale: number): number => {
  return Math.max(0, Math.min(MAX_LOD, Math.floor(-Math.log2(scale))));
};

const BACKGROUND_COLOR = '#23272e';
const INACTIVE_CELL_COLOR = '#2d3a4a';

/**
 * Draw only cells that intersect the given world-space region.
 * Assumes ctx transform is already set for the tile's coordinate space.
 */
const drawCellsInRegion = (
  ctx: CanvasRenderingContext2D,
  layout: GridLayout,
  regionLeft: number,
  regionTop: number,
  regionRight: number,
  regionBottom: number,
  color: string,
): void => {
  const startCol = Math.max(
    0,
    Math.floor((regionLeft - layout.computedPaddingLeft) / layout.colStride),
  );
  const endCol = Math.min(
    layout.numberOfCols - 1,
    Math.ceil((regionRight - layout.computedPaddingLeft) / layout.colStride),
  );
  const startRow = Math.max(
    0,
    Math.floor((regionTop - layout.paddingTop) / layout.rowStride),
  );
  const totalRows = Math.ceil(layout.totalCells / layout.numberOfCols);
  const endRow = Math.min(
    totalRows - 1,
    Math.ceil((regionBottom - layout.paddingTop) / layout.rowStride),
  );

  if (startCol > endCol || startRow > endRow) return;

  ctx.fillStyle = color;
  ctx.beginPath();

  for (let row = startRow; row <= endRow; row++) {
    const rowStart = row * layout.numberOfCols;
    for (let col = startCol; col <= endCol; col++) {
      if (rowStart + col >= layout.totalCells) break;
      const x = layout.computedPaddingLeft + col * layout.colStride;
      const y = layout.paddingTop + row * layout.rowStride;
      ctx.rect(x, y, layout.cellWidth, layout.cellHeight);
    }
  }

  ctx.fill();
};

const buildLODLevel = (layout: GridLayout, level: number): LODData => {
  const power = Math.pow(2, level);
  const scaleFactor = 1 / power;
  const coverage = TILE_SIZE * power;
  const tileCols = Math.ceil(layout.canvasWidth / coverage);
  const tileRows = Math.ceil(layout.canvasHeight / coverage);
  const tiles = new Map<string, StaticTile>();

  for (let ty = 0; ty < tileRows; ty++) {
    for (let tx = 0; tx < tileCols; tx++) {
      const logicalLeft = tx * coverage;
      const logicalTop = ty * coverage;
      const logicalWidth = Math.min(coverage, layout.canvasWidth - logicalLeft);
      const logicalHeight = Math.min(coverage, layout.canvasHeight - logicalTop);
      const bitmapW = Math.ceil(logicalWidth * scaleFactor);
      const bitmapH = Math.ceil(logicalHeight * scaleFactor);

      const canvas = document.createElement('canvas');
      canvas.width = bitmapW;
      canvas.height = bitmapH;
      const ctx = canvas.getContext('2d');
      if (!ctx) continue;

      // Transform: scale to LOD resolution + offset to tile's world region
      ctx.scale(scaleFactor, scaleFactor);
      ctx.translate(-logicalLeft, -logicalTop);

      ctx.fillStyle = BACKGROUND_COLOR;
      ctx.fillRect(logicalLeft, logicalTop, logicalWidth, logicalHeight);

      drawCellsInRegion(
        ctx, layout,
        logicalLeft, logicalTop,
        logicalLeft + logicalWidth, logicalTop + logicalHeight,
        INACTIVE_CELL_COLOR,
      );

      tiles.set(`${tx},${ty}`, {
        tileX: tx, tileY: ty, width: bitmapW, height: bitmapH,
        logicalWidth, logicalHeight, canvas,
      });
    }
  }

  return { level, coverage, tileCols, tileRows, tiles };
};

const buildCacheKey = (layout: GridLayout): string => {
  return `${layout.canvasWidth}|${layout.canvasHeight}|${layout.numberOfCells}|${layout.numberOfCols}|${layout.totalCells}|${layout.computedPaddingLeft}|${layout.cellWidth}|${layout.cellHeight}|${layout.colStride}|${layout.rowStride}|${layout.paddingTop}`;
};

export const getLODData = (layout: GridLayout): LODData[] => {
  const key = buildCacheKey(layout);
  if (tileCache && tileCache.key === key) {
    return tileCache.lods;
  }

  const lods: LODData[] = [];
  for (let level = 0; level <= MAX_LOD; level++) {
    lods.push(buildLODLevel(layout, level));
  }

  tileCache = { key, lods };
  return lods;
};

export const clearTileCache = (): void => {
  tileCache = null;
};

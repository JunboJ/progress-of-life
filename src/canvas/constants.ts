// ─── Canvas Colors ────────────────────────────────────────────────────────────
export const COLOR_BACKGROUND = '#23272e';
export const COLOR_CELL_INACTIVE = '#2d3a4a';
export const COLOR_CELL_ACTIVE = '#0b3d91';

// ─── Outline Colors ───────────────────────────────────────────────────────────
export const COLOR_OUTLINE_DAY = '#FFFFFF';
export const COLOR_OUTLINE_YEAR = '#FF6B6B';
export const COLOR_OUTLINE_MONTH = '#4ECDC4';
export const COLOR_OUTLINE_WEEK = '#FFE66D';

// ─── Outline Geometry ─────────────────────────────────────────────────────────
/** Pixel padding added around each cell when drawing outline bounds. */
export const OUTLINE_CELL_PADDING = 2;
/** Base line width (screen pixels) before scaling. */
export const OUTLINE_BASE_LINE_WIDTH = 0.6;
/** Line-width multiplier for the single-day outline. */
export const OUTLINE_DAY_LINE_WIDTH_MULTIPLIER = 2;
/** Line-width multiplier for year / month / week group outlines. */
export const OUTLINE_GROUP_LINE_WIDTH_MULTIPLIER = 3;

// ─── Camera / Zoom ────────────────────────────────────────────────────────────
export const INITIAL_SCALE = 0.3;
export const MIN_SCALE = 0.1;
export const MAX_SCALE = 3;
export const ZOOM_IN_FACTOR = 1.1;
export const ZOOM_OUT_FACTOR = 0.9;

// ─── Animation ────────────────────────────────────────────────────────────────
export const ANIMATION_DURATION_MS = 5000;
export const ANIMATION_EASE_POWER = 1.8;

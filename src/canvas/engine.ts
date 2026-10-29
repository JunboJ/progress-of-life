import {
	DateObj,
	isAfter,
	isBefore,
	isSame,
	isSameOrBefore,
	diffDates,
	addDuration,
	formatDate,
	startOf,
	endOf,
} from "../utils/date";
import { CalendarStyle, CalendarStyle as DefaultCalendarStyle } from "./style";
import { getCalendarCellFromPoint, CalendarCellPosition } from "./utils";
import { getDayOutlineBounds, drawOutline } from "./outlineUtils";
import { createGridLayout, getLODData, pickLODLevel, GridLayout, LODData } from "./tileCache";
import { useTooltipStore } from "../store/tooltipStore";
import { useCanvasEngineStore } from "../store/canvasEngineStore";
import { DateModalState, useDateModalStore } from "../store/dateModalStore";
import {
	COLOR_BACKGROUND,
	COLOR_CELL_ACTIVE,
	COLOR_CELL_INACTIVE,
	COLOR_OUTLINE_DAY,
	OUTLINE_BASE_LINE_WIDTH,
	OUTLINE_DAY_LINE_WIDTH_MULTIPLIER,
	INITIAL_SCALE,
	MIN_SCALE,
	MAX_SCALE,
	ZOOM_IN_FACTOR,
	ZOOM_OUT_FACTOR,
	ANIMATION_DURATION_MS,
	ANIMATION_EASE_POWER,
	ZOOM_TO_CELL_SCALE,
	ZOOM_ANIMATION_DURATION_MS,
	ZOOM_ANIMATION_EASE_POWER,
	CELL_BORDER_RADIUS,
	STATIC_DIRECT_DRAW_THRESHOLD,
	DOUBLE_CLICK_DELAY_MS,
	DOUBLE_CLICK_DISTANCE,
	VIEW_FIT_MARGIN,
	VIEW_MAX_LEVEL,
} from "./constants";

/**
 * A window onto the life grid. Level 0 is the whole life, 1 a year, 2 a month, 3 a week.
 * `startIndex` is the day offset from the life's start date; `days` is the number of cells shown.
 */
interface ViewState {
	level: number;
	startIndex: number;
	days: number;
	gridWidth: number;
	label: string;
}

const WHOLE_LIFE_LABEL = "Whole life";

/** Label for a zoomed-in view: "2026", "2026 October" or "2026 October Week 2". */
const getViewLabel = (date: DateObj, level: number): string => {
	if (level === 1) return formatDate(date, "YYYY");
	if (level === 2) return formatDate(date, "YYYY MMMM");

	// Week number within the month, counted from the week containing the 1st
	const weekStart = startOf(date, "week");
	const dayOfMonth = Number(formatDate(weekStart, "D"));
	const firstWeekday = Number(formatDate(startOf(weekStart, "month"), "d"));
	const weekOfMonth = Math.ceil((dayOfMonth + firstWeekday) / 7);
	return `${formatDate(weekStart, "YYYY MMMM")} Week ${weekOfMonth}`;
};

const VIEW_LEVEL_UNITS = [null, "year", "month", "week"] as const;

export interface CanvasEngineConfig {
	days: number;
	startDate: DateObj;
	today: DateObj;
	gridWidth: number;
	collapseGridGap: boolean;
	animateHighlight: boolean;
	onAnimationFinished?: () => void;
}

export class CanvasEngine {
	private container: HTMLElement;
	private staticCanvas: HTMLCanvasElement;
	private activeCanvas: HTMLCanvasElement;
	private overlayCanvas: HTMLCanvasElement;

	private config: CanvasEngineConfig;
	private calendarStyle: CalendarStyle = { ...DefaultCalendarStyle };
	private gridLayout: GridLayout | null = null;
	private lodData: LODData[] = [];
	private dpr = window.devicePixelRatio || 1;

	// Virtual camera
	private offset = { x: 0, y: 0 };
	private scale = INITIAL_SCALE;

	// Viewport size (CSS pixels)
	private viewportWidth = 0;
	private viewportHeight = 0;

	// Interaction
	private dragging = false;
	private lastPointer = { x: 0, y: 0 };
	private pointerDownPos = { x: 0, y: 0 };
	private lastClientPos: { x: number; y: number } | null = null;
	private pendingClick: {
		timer: number;
		x: number;
		y: number;
		cell: CalendarCellPosition | null;
	} | null = null;

	// Grid view (whole life -> year -> month -> week)
	private view: ViewState = { level: 0, startIndex: 0, days: 0, gridWidth: 0, label: WHOLE_LIFE_LABEL };
	private viewLabelEl: HTMLDivElement;
	private viewStack: ViewState[] = [];

	// Animation
	private animationRunning = false;
	private animationStartTime: number | null = null;
	private activeHighlightCount = 0;

	// Hover
	private hoveredCellIndex: number | null = null;
	private hoverRafId: number | null = null;
	private pendingPointer: { x: number; y: number } | null = null;

	// Zoom animation
	private zoomAnimRunning = false;
	private zoomAnimStartTime: number | null = null;
	private zoomAnimFrom = { scale: 1, offsetX: 0, offsetY: 0 };
	private zoomAnimTo = { scale: 1, offsetX: 0, offsetY: 0 };
	private zoomToCellIndex: number | null = null;
	private preZoomLevel: number | null = null;

	// Repaint scheduling
	private repaintRafId: number | null = null;
	private dirty = { static: true, active: true, overlay: true };

	// Resize
	private resizeObserver: ResizeObserver | null = null;

	// Bound handlers
	private boundPointerDown: (e: PointerEvent) => void;
	private boundPointerMove: (e: PointerEvent) => void;
	private boundPointerUp: (e: PointerEvent) => void;
	private boundWheel: (e: WheelEvent) => void;
	private boundPointerLeave: () => void;
	private zoomAnimResolve?: () => void;
	private boundDateModalClose: (state: DateModalState, prevState: DateModalState) => void;

	constructor(container: HTMLElement, config: CanvasEngineConfig) {
		this.container = container;
		this.config = { ...config };
		this.view = {
			level: 0,
			startIndex: 0,
			days: config.days,
			gridWidth: config.gridWidth,
			label: WHOLE_LIFE_LABEL,
		};

		container.style.overflow = "hidden";
		container.style.touchAction = "none";
		container.style.backgroundColor = COLOR_BACKGROUND;

		this.staticCanvas = this.createCanvas();
		this.activeCanvas = this.createCanvas();
		this.overlayCanvas = this.createCanvas();

		container.appendChild(this.staticCanvas);
		container.appendChild(this.activeCanvas);
		container.appendChild(this.overlayCanvas);

		this.viewLabelEl = this.createViewLabel();
		container.appendChild(this.viewLabelEl);

		this.boundPointerDown = this.onPointerDown.bind(this);
		this.boundPointerMove = this.onPointerMove.bind(this);
		this.boundPointerUp = this.onPointerUp.bind(this);
		this.boundWheel = this.onWheel.bind(this);
		this.boundPointerLeave = this.onPointerLeave.bind(this);
		this.boundDateModalClose = this.onDateModalClose.bind(this);

		this.updateCalendarStyle();
	}

	private createCanvas(): HTMLCanvasElement {
		const canvas = document.createElement("canvas");
		canvas.style.position = "absolute";
		canvas.style.top = "0";
		canvas.style.left = "0";
		canvas.style.pointerEvents = "none";
		return canvas;
	}

	private createViewLabel(): HTMLDivElement {
		const el = document.createElement("div");
		el.textContent = this.view.label;
		el.style.position = "absolute";
		el.style.top = "16px";
		el.style.left = "16px";
		el.style.pointerEvents = "none";
		el.style.userSelect = "none";
		el.style.color = "#e6edf3";
		el.style.font = "600 20px system-ui, sans-serif";
		el.style.textShadow = "0 1px 4px rgba(0, 0, 0, 0.6)";
		return el;
	}

	mount(): void {
		this.container.addEventListener("pointerdown", this.boundPointerDown);
		this.container.addEventListener("pointermove", this.boundPointerMove);
		this.container.addEventListener("pointerup", this.boundPointerUp);
		this.container.addEventListener("pointercancel", this.boundPointerUp);
		this.container.addEventListener("wheel", this.boundWheel, { passive: false });
		this.container.addEventListener("pointerleave", this.boundPointerLeave);

		useDateModalStore.subscribe(this.boundDateModalClose);

		this.resizeObserver = new ResizeObserver((entries) => {
			for (const entry of entries) {
				this.handleResize(entry.contentRect.width, entry.contentRect.height);
			}
		});
		this.resizeObserver.observe(this.container);

		this.handleResize(this.container.clientWidth, this.container.clientHeight);
		this.startActiveLayer();
	}

	unmount(): void {
		this.container.removeEventListener("pointerdown", this.boundPointerDown);
		this.container.removeEventListener("pointermove", this.boundPointerMove);
		this.container.removeEventListener("pointerup", this.boundPointerUp);
		this.container.removeEventListener("pointercancel", this.boundPointerUp);
		this.container.removeEventListener("wheel", this.boundWheel);
		this.container.removeEventListener("pointerleave", this.boundPointerLeave);
		this.resizeObserver?.disconnect();
		this.cancelAnimation();
		if (this.pendingClick) {
			window.clearTimeout(this.pendingClick.timer);
			this.pendingClick = null;
		}
		if (this.hoverRafId !== null) cancelAnimationFrame(this.hoverRafId);
		if (this.repaintRafId !== null) cancelAnimationFrame(this.repaintRafId);
	}

	update(config: Partial<CanvasEngineConfig>): void {
		const prev = { ...this.config };
		Object.assign(this.config, config);

		const styleChanged = prev.collapseGridGap !== this.config.collapseGridGap;
		const structureChanged =
			prev.days !== this.config.days ||
			prev.gridWidth !== this.config.gridWidth ||
			!isSame(prev.startDate, this.config.startDate, "day") ||
			styleChanged;

		if (styleChanged) this.updateCalendarStyle();
		if (structureChanged) {
			const wasSubView = this.view.level > 0;
			this.resetView();
			this.rebuildLayout();
			if (wasSubView) this.centerCanvas();
		}
		this.cancelAnimation();
		this.startActiveLayer();
		this.markAllDirty();
	}

	setGridWidth(width: number): void {
		this.update({ gridWidth: width });
	}

	getGridWidth(): number {
		return this.config.gridWidth;
	}

	// --- Internal setup ---

	private updateCalendarStyle(): void {
		this.calendarStyle = {
			...DefaultCalendarStyle,
			cellGap: this.config.collapseGridGap ? 0 : DefaultCalendarStyle.cellGap,
		};
	}

	private resetView(): void {
		this.viewStack = [];
		this.view = {
			level: 0,
			startIndex: 0,
			days: this.config.days,
			gridWidth: this.config.gridWidth,
			label: WHOLE_LIFE_LABEL,
		};
		this.viewLabelEl.textContent = WHOLE_LIFE_LABEL;
		this.hoveredCellIndex = null;
	}

	/** Grid width for a sub-view, chosen so the few cells shown fill the viewport nicely. */
	private computeSubViewGridWidth(level: number, days: number): number {
		const s = this.calendarStyle;
		const aspect = this.viewportHeight > 0 ? this.viewportWidth / this.viewportHeight : 1;
		const desiredCols = level === 1 ? Math.ceil(Math.sqrt(days * aspect)) : 7;
		const cols = Math.max(1, Math.min(days, desiredCols));
		return s.paddingLeft + s.paddingRight + s.cellGap + cols * (s.cellWidth + s.cellGap);
	}

	private rebuildLayout(): void {
		const v = this.view;
		if (v.level === 0) {
			v.startIndex = 0;
			v.days = this.config.days;
			v.gridWidth = this.config.gridWidth;
		} else {
			v.gridWidth = this.computeSubViewGridWidth(v.level, v.days);
		}

		this.gridLayout = createGridLayout(v.days, v.gridWidth, this.calendarStyle);
		// Sub-views have few cells and are always drawn directly; LOD tiles are only for the full grid.
		if (this.gridLayout && v.level === 0) {
			this.lodData = getLODData(this.gridLayout);
		}
	}

	private getViewStartDate(): DateObj {
		return addDuration(this.config.startDate, this.view.startIndex, "day");
	}

	/** Number of highlighted (passed) cells within the current view. */
	private getViewActiveCount(): number {
		return Math.max(0, Math.min(this.view.days, this.activeHighlightCount - this.view.startIndex));
	}

	private setView(next: ViewState): void {
		this.view = next;
		this.viewLabelEl.textContent = next.label;
		this.hoveredCellIndex = null;
		this.rebuildLayout();
		this.centerCanvas();
		this.markAllDirty();

		if (this.lastClientPos) {
			this.updateHover(this.lastClientPos.x, this.lastClientPos.y);
		}
	}

	private zoomInView(cellIndex: number): void {
		if (this.view.level >= VIEW_MAX_LEVEL) return;

		const nextLevel = this.view.level + 1;
		const unit = VIEW_LEVEL_UNITS[nextLevel];
		if (!unit) return;

		const rootStart = startOf(this.config.startDate, "day");
		const rootEnd = startOf(addDuration(this.config.startDate, this.config.days - 1, "day"), "day");
		const date = addDuration(this.getViewStartDate(), cellIndex, "day");

		let groupStart = startOf(date, unit);
		let groupEnd = startOf(endOf(date, unit), "day");
		if (isBefore(groupStart, rootStart)) groupStart = rootStart;
		if (isAfter(groupEnd, rootEnd)) groupEnd = rootEnd;

		const startIndex = Math.round(diffDates(groupStart, rootStart, "day", true));
		const days = Math.round(diffDates(groupEnd, groupStart, "day", true)) + 1;
		if (days <= 0) return;

		this.viewStack.push(this.view);
		this.setView({ level: nextLevel, startIndex, days, gridWidth: 0, label: getViewLabel(date, nextLevel) });
	}

	private zoomOutView(): void {
		const previous = this.viewStack.pop();
		if (!previous) return;
		this.setView(previous);
	}

	private handleResize(width: number, height: number): void {
		this.viewportWidth = width;
		this.viewportHeight = height;
		this.dpr = window.devicePixelRatio || 1;
		this.sizeCanvases();
		this.rebuildLayout();
		this.centerCanvas();
		this.markAllDirty();
	}

	private sizeCanvases(): void {
		const w = this.viewportWidth;
		const h = this.viewportHeight;
		const d = this.dpr;
		for (const canvas of [this.staticCanvas, this.activeCanvas, this.overlayCanvas]) {
			canvas.width = Math.round(w * d);
			canvas.height = Math.round(h * d);
			canvas.style.width = `${w}px`;
			canvas.style.height = `${h}px`;
		}
	}

	private centerCanvas(): void {
		if (!this.gridLayout) return;
		if (this.view.level === 0) {
			this.scale = INITIAL_SCALE;
		} else {
			const fit = Math.min(
				(this.viewportWidth * VIEW_FIT_MARGIN) / this.gridLayout.canvasWidth,
				(this.viewportHeight * VIEW_FIT_MARGIN) / this.gridLayout.canvasHeight
			);
			this.scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, fit));
		}
		this.offset = {
			x: (this.viewportWidth - this.gridLayout.canvasWidth * this.scale) / 2,
			y: (this.viewportHeight - this.gridLayout.canvasHeight * this.scale) / 2,
		};
	}

	// --- Repaint scheduling ---

	private markAllDirty(): void {
		this.dirty.static = true;
		this.dirty.active = true;
		this.dirty.overlay = true;
		this.scheduleRepaint();
	}

	private scheduleRepaint(): void {
		if (this.repaintRafId !== null) return;
		this.repaintRafId = requestAnimationFrame((timestamp) => {
			this.repaintRafId = null;

			if (this.animationRunning) {
				this.tickAnimation(timestamp);
			}

			if (this.zoomAnimRunning) {
				this.tickZoomAnimation(timestamp);
			}

			this.flushRepaint();

			if (this.animationRunning || this.zoomAnimRunning) {
				this.scheduleRepaint();
			}
		});
	}

	private flushRepaint(): void {
		if (this.dirty.static) {
			this.repaintStatic();
			this.dirty.static = false;
		}
		if (this.dirty.active) {
			this.repaintActive();
			this.dirty.active = false;
		}
		if (this.dirty.overlay) {
			this.repaintOverlay();
			this.dirty.overlay = false;
		}
	}

	// --- Coordinate helpers ---

	private getVisibleWorldRect() {
		return {
			left: -this.offset.x / this.scale,
			top: -this.offset.y / this.scale,
			right: (this.viewportWidth - this.offset.x) / this.scale,
			bottom: (this.viewportHeight - this.offset.y) / this.scale,
		};
	}

	/** Set ctx transform to map world coordinates → canvas device pixels. */
	private setWorldTransform(ctx: CanvasRenderingContext2D): void {
		const d = this.dpr;
		ctx.setTransform(this.scale * d, 0, 0, this.scale * d, this.offset.x * d, this.offset.y * d);
	}

	/** Set ctx transform to map CSS pixels → canvas device pixels. */
	private setScreenTransform(ctx: CanvasRenderingContext2D): void {
		ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
	}

	private clearCanvas(canvas: HTMLCanvasElement): void {
		const ctx = canvas.getContext("2d");
		if (!ctx) return;
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.clearRect(0, 0, canvas.width, canvas.height);
	}

	// --- Static layer (LOD tiles) ---

	private repaintStatic(): void {
		const ctx = this.staticCanvas.getContext("2d");
		if (!ctx || !this.gridLayout) return;

		this.clearCanvas(this.staticCanvas);

		// Above the threshold (or in a sub-view), draw directly in world space for crisp vector rounded corners
		if (this.view.level > 0 || this.scale > STATIC_DIRECT_DRAW_THRESHOLD) {
			this.repaintStaticDirect(ctx);
			return;
		}

		const level = pickLODLevel(this.scale);
		const lod = this.lodData[level];
		if (!lod) return;

		const visible = this.getVisibleWorldRect();
		const { coverage } = lod;

		const tileMinX = Math.max(0, Math.floor(visible.left / coverage));
		const tileMinY = Math.max(0, Math.floor(visible.top / coverage));
		const tileMaxX = Math.min(lod.tileCols - 1, Math.floor(visible.right / coverage));
		const tileMaxY = Math.min(lod.tileRows - 1, Math.floor(visible.bottom / coverage));

		this.setScreenTransform(ctx);
		ctx.imageSmoothingEnabled = false;

		for (let ty = tileMinY; ty <= tileMaxY; ty++) {
			for (let tx = tileMinX; tx <= tileMaxX; tx++) {
				const tile = lod.tiles.get(`${tx},${ty}`);
				if (!tile) continue;

				const worldX = tx * coverage;
				const worldY = ty * coverage;
				const screenX = worldX * this.scale + this.offset.x;
				const screenY = worldY * this.scale + this.offset.y;
				const screenW = tile.logicalWidth * this.scale;
				const screenH = tile.logicalHeight * this.scale;

				ctx.drawImage(tile.canvas, screenX, screenY, screenW, screenH);
			}
		}
	}

	// --- Active layer ---

	private repaintStaticDirect(ctx: CanvasRenderingContext2D): void {
		const layout = this.gridLayout!;
		const visible = this.getVisibleWorldRect();

		const startCol = Math.max(0, Math.floor((visible.left - layout.computedPaddingLeft) / layout.colStride));
		const endCol = Math.min(
			layout.numberOfCols - 1,
			Math.ceil((visible.right - layout.computedPaddingLeft) / layout.colStride)
		);
		const totalRows = Math.ceil(layout.totalCells / layout.numberOfCols);
		const startRow = Math.max(0, Math.floor((visible.top - layout.paddingTop) / layout.rowStride));
		const endRow = Math.min(totalRows - 1, Math.ceil((visible.bottom - layout.paddingTop) / layout.rowStride));

		if (startRow > endRow || startCol > endCol) return;

		this.setWorldTransform(ctx);
		ctx.fillStyle = COLOR_CELL_INACTIVE;
		ctx.beginPath();

		for (let row = startRow; row <= endRow; row++) {
			for (let col = startCol; col <= endCol; col++) {
				const cellIndex = row * layout.numberOfCols + col;
				if (cellIndex >= layout.totalCells) break;
				const x = layout.computedPaddingLeft + col * layout.colStride;
				const y = layout.paddingTop + row * layout.rowStride;
				ctx.roundRect(x, y, layout.cellWidth, layout.cellHeight, CELL_BORDER_RADIUS);
			}
		}

		ctx.fill();
	}

	private startActiveLayer(): void {
		const passedDays = this.getPassedDaysCount();

		if (!this.config.animateHighlight) {
			this.activeHighlightCount = passedDays;
			this.animationRunning = false;
			return;
		}

		this.activeHighlightCount = 0;
		this.animationRunning = true;
		this.animationStartTime = null;
		this.scheduleRepaint();
	}

	private tickAnimation(timestamp: number): void {
		if (!this.animationStartTime) this.animationStartTime = timestamp;

		const elapsed = timestamp - this.animationStartTime;
		const progress = Math.min(1, elapsed / ANIMATION_DURATION_MS);
		const eased = Math.pow(progress, ANIMATION_EASE_POWER);
		const passedDays = this.getPassedDaysCount();

		this.activeHighlightCount = Math.min(passedDays, Math.ceil(eased * passedDays));
		this.dirty.active = true;

		if (progress >= 1) {
			this.animationRunning = false;
			this.animationStartTime = null;
			this.config.onAnimationFinished?.();
		}
	}

	private repaintActive(): void {
		const ctx = this.activeCanvas.getContext("2d");
		if (!ctx || !this.gridLayout) return;

		this.clearCanvas(this.activeCanvas);

		const activeCount = this.getViewActiveCount();
		if (activeCount <= 0) return;

		const layout = this.gridLayout;
		const visible = this.getVisibleWorldRect();

		const startCol = Math.max(0, Math.floor((visible.left - layout.computedPaddingLeft) / layout.colStride));
		const endCol = Math.min(
			layout.numberOfCols - 1,
			Math.ceil((visible.right - layout.computedPaddingLeft) / layout.colStride)
		);
		const startRow = Math.max(0, Math.floor((visible.top - layout.paddingTop) / layout.rowStride));
		const maxActiveRow = Math.floor((activeCount - 1) / layout.numberOfCols);
		const visibleEndRow = Math.ceil((visible.bottom - layout.paddingTop) / layout.rowStride);
		const endRow = Math.min(maxActiveRow, visibleEndRow);

		if (startRow > endRow || startCol > endCol) return;

		this.setWorldTransform(ctx);
		ctx.fillStyle = COLOR_CELL_ACTIVE;
		ctx.beginPath();

		for (let row = startRow; row <= endRow; row++) {
			const rowStart = row * layout.numberOfCols;
			for (let col = startCol; col <= endCol; col++) {
				const cellIndex = rowStart + col;
				if (cellIndex >= activeCount) break;
				const x = layout.computedPaddingLeft + col * layout.colStride;
				const y = layout.paddingTop + row * layout.rowStride;
				ctx.roundRect(x, y, layout.cellWidth, layout.cellHeight, CELL_BORDER_RADIUS);
			}
		}

		ctx.fill();
	}

	private cancelAnimation(): void {
		this.animationRunning = false;
		this.animationStartTime = null;
	}

	private tickZoomAnimation(timestamp: number): void {
		if (!this.zoomAnimStartTime) this.zoomAnimStartTime = timestamp;
		const elapsed = timestamp - this.zoomAnimStartTime;
		const progress = Math.min(1, elapsed / ZOOM_ANIMATION_DURATION_MS);
		const eased = 1 - Math.pow(1 - progress, ZOOM_ANIMATION_EASE_POWER);

		this.scale = this.zoomAnimFrom.scale + (this.zoomAnimTo.scale - this.zoomAnimFrom.scale) * eased;
		this.offset.x = this.zoomAnimFrom.offsetX + (this.zoomAnimTo.offsetX - this.zoomAnimFrom.offsetX) * eased;
		this.offset.y = this.zoomAnimFrom.offsetY + (this.zoomAnimTo.offsetY - this.zoomAnimFrom.offsetY) * eased;

		this.dirty.static = true;
		this.dirty.active = true;
		this.dirty.overlay = true;

		if (progress >= 1) {
			this.zoomAnimRunning = false;
			this.zoomAnimStartTime = null;
			this.zoomAnimResolve?.();
			this.zoomAnimResolve = undefined;
		}
	}

	zoomToCell(cellIndex: number, zoomLevel?: number) {
		const bounds = getDayOutlineBounds(cellIndex, this.view.days, this.view.gridWidth, this.calendarStyle);
		if (!bounds) return;

		const resolvedZoomLevel = zoomLevel ?? ZOOM_TO_CELL_SCALE;
		const worldCenterX = (bounds.minX + bounds.maxX) / 2;
		const worldCenterY = (bounds.minY + bounds.maxY) / 2;
		const targetScale = Math.min(resolvedZoomLevel);

		this.zoomAnimFrom = { scale: this.scale, offsetX: this.offset.x, offsetY: this.offset.y };
		this.zoomAnimTo = {
			scale: targetScale,
			offsetX: this.viewportWidth / 2 - worldCenterX * targetScale,
			offsetY: this.viewportHeight / 2 - worldCenterY * targetScale,
		};

		this.zoomAnimRunning = true;
		this.zoomAnimStartTime = null;
		this.scheduleRepaint();

		return new Promise<{ width: number; height: number; isCellActive: boolean }>((resolve) => {
			const screenW = this.calendarStyle.cellWidth * resolvedZoomLevel;
			const screenH = this.calendarStyle.cellHeight * resolvedZoomLevel;
			this.zoomAnimResolve = () =>
				resolve({ width: screenW, height: screenH, isCellActive: this.isCellActive(cellIndex) });
			this.scheduleRepaint();
		});
	}

	isCellActive(cellIndex: number): boolean {
		const date = addDuration(this.getViewStartDate(), cellIndex, "day");
		return isSameOrBefore(date, this.config.today);
	}

	private getPassedDaysCount(): number {
		const { startDate, today } = this.config;
		return !isAfter(startDate, today, "day") ? diffDates(today, startDate, "day") + 1 : 0;
	}

	// --- Overlay layer (outlines) ---

	private repaintOverlay(): void {
		const ctx = this.overlayCanvas.getContext("2d");
		if (!ctx) return;

		this.clearCanvas(this.overlayCanvas);

		if (this.hoveredCellIndex === null) return;

		this.setWorldTransform(ctx);

		// Compensate line width so it's constant in screen pixels
		const lw = OUTLINE_BASE_LINE_WIDTH / this.scale;

		const dayBounds = getDayOutlineBounds(
			this.hoveredCellIndex,
			this.view.days,
			this.view.gridWidth,
			this.calendarStyle
		);
		if (dayBounds) drawOutline(ctx, dayBounds, COLOR_OUTLINE_DAY, OUTLINE_DAY_LINE_WIDTH_MULTIPLIER * lw);
	}

	// --- Pointer / interaction ---

	private toCanvasPoint(clientX: number, clientY: number) {
		const rect = this.container.getBoundingClientRect();
		return {
			x: (clientX - rect.left - this.offset.x) / this.scale,
			y: (clientY - rect.top - this.offset.y) / this.scale,
		};
	}

	private getCellAtPoint(pointX: number, pointY: number): CalendarCellPosition | null {
		return getCalendarCellFromPoint(this.calendarStyle, {
			numberOfCells: this.view.days,
			canvasWidth: this.view.gridWidth,
			pointX,
			pointY,
		});
	}

	private updateHover(clientX: number, clientY: number): void {
		const point = this.toCanvasPoint(clientX, clientY);
		const cell = this.getCellAtPoint(point.x, point.y);

		if (cell) {
			if (this.hoveredCellIndex === cell.cellIndex) return;

			this.hoveredCellIndex = cell.cellIndex;
			const currentDate = addDuration(this.getViewStartDate(), cell.cellIndex, "day");

			useTooltipStore.getState().showTooltip(clientX, clientY, formatDate(currentDate, "ddd, YYYY-MM-DD"));
			useCanvasEngineStore.getState().setHoveredDate(currentDate);

			this.dirty.overlay = true;
			this.scheduleRepaint();
		}
	}

	private onPointerDown(e: PointerEvent): void {
		if (e.button !== 0) return;
		this.dragging = true;
		this.lastPointer = { x: e.clientX, y: e.clientY };
		this.pointerDownPos = { x: e.clientX, y: e.clientY };
		this.container.setPointerCapture(e.pointerId);
	}

	private onPointerMove(e: PointerEvent): void {
		this.lastClientPos = { x: e.clientX, y: e.clientY };
		if (this.dragging) {
			const dx = e.clientX - this.lastPointer.x;
			const dy = e.clientY - this.lastPointer.y;
			this.offset.x += dx;
			this.offset.y += dy;
			this.lastPointer = { x: e.clientX, y: e.clientY };
			this.markAllDirty();
			return;
		}

		// Hover — throttle to rAF
		this.pendingPointer = { x: e.clientX, y: e.clientY };
		if (this.hoverRafId === null) {
			this.hoverRafId = requestAnimationFrame(() => {
				this.hoverRafId = null;
				if (!this.pendingPointer) return;
				const { x, y } = this.pendingPointer;
				this.pendingPointer = null;
				this.updateHover(x, y);
			});
		}
	}

	private async onPointerUp(e: PointerEvent) {
		const dx = e.clientX - this.pointerDownPos.x;
		const dy = e.clientY - this.pointerDownPos.y;
		const isClick = Math.sqrt(dx * dx + dy * dy) < 5;

		this.dragging = false;
		this.container.releasePointerCapture(e.pointerId);

		if (!isClick) return;

		// A second click near the first one is a double click: open the day editor.
		// Otherwise the click is held back briefly so it can't be mistaken for half a double click.
		if (this.pendingClick) {
			const prev = this.pendingClick;
			window.clearTimeout(prev.timer);
			this.pendingClick = null;

			const near = Math.hypot(e.clientX - prev.x, e.clientY - prev.y) < DOUBLE_CLICK_DISTANCE;
			if (near) {
				if (prev.cell) await this.openDayEditor(prev.cell);
				return;
			}
			this.handleSingleClick(prev.cell);
		}

		const point = this.toCanvasPoint(e.clientX, e.clientY);
		const cell = this.getCellAtPoint(point.x, point.y);
		this.pendingClick = {
			x: e.clientX,
			y: e.clientY,
			cell,
			timer: window.setTimeout(() => {
				this.pendingClick = null;
				this.handleSingleClick(cell);
			}, DOUBLE_CLICK_DELAY_MS),
		};
	}

	/** Single click on a cell zooms in one level; click outside the cells zooms out one level. */
	private handleSingleClick(cell: CalendarCellPosition | null): void {
		if (cell) this.zoomInView(cell.cellIndex);
		else this.zoomOutView();
	}

	private async openDayEditor(cell: CalendarCellPosition) {
		this.preZoomLevel = this.scale;
		this.zoomToCellIndex = cell.cellIndex;
		const result = await this.zoomToCell(cell.cellIndex, 20);

		if (result) {
			const date = addDuration(this.getViewStartDate(), cell.cellIndex, "day");
			useDateModalStore.getState().openModal(formatDate(date, "YYYY-MM-DD"), {
				width: result.width,
				height: result.height,
				isActive: result.isCellActive,
				startDate: formatDate(this.config.startDate, "YYYY-MM-DD"),
				calendarCellPosition: cell,
			});
		} else {
			this.zoomToCellIndex = null;
			this.preZoomLevel = null;
		}
	}

	private onWheel(e: WheelEvent): void {
		e.preventDefault();
		const previousScale = this.scale;
		const nextScale = Math.min(
			MAX_SCALE,
			Math.max(MIN_SCALE, previousScale * (e.deltaY > 0 ? ZOOM_OUT_FACTOR : ZOOM_IN_FACTOR))
		);
		if (nextScale === previousScale) return;

		const rect = this.container.getBoundingClientRect();
		const point = {
			x: (e.clientX - rect.left - this.offset.x) / previousScale,
			y: (e.clientY - rect.top - this.offset.y) / previousScale,
		};

		this.scale = nextScale;
		this.offset = {
			x: e.clientX - rect.left - point.x * nextScale,
			y: e.clientY - rect.top - point.y * nextScale,
		};
		this.markAllDirty();
	}

	private onPointerLeave(): void {
		if (this.hoverRafId !== null) {
			cancelAnimationFrame(this.hoverRafId);
			this.hoverRafId = null;
		}
		this.pendingPointer = null;
		this.hoveredCellIndex = null;

		useTooltipStore.getState().setHidden(true);
		useCanvasEngineStore.getState().setHoveredDate(null);

		this.dirty.overlay = true;
		this.scheduleRepaint();
	}

	private onDateModalClose(state: DateModalState, prevState: DateModalState) {
		if (!state.open && prevState.open) {
			this.zoomToCell(this.zoomToCellIndex ?? -1, this.preZoomLevel ?? this.scale);
		}
	}
}

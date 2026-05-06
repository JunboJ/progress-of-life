import { DateObj, isAfter, diffDates, addDuration, formatDate } from "../utils/date";
import { CalendarStyle, CalendarStyle as DefaultCalendarStyle } from "./style";
import { getCalendarCellFromPoint } from "./utils";
import { getDayOutlineBounds, drawOutline, getOutlineBounds, drawMultiRowOutline } from "./outlineUtils";
import { createGridLayout, getLODData, pickLODLevel, GridLayout, LODData } from "./tileCache";
import { useTooltipStore } from "../store/tooltipStore";
import { useCanvasEngineStore } from "../store/canvasEngineStore";
import {
	COLOR_BACKGROUND,
	COLOR_CELL_ACTIVE,
	COLOR_OUTLINE_DAY,
	COLOR_OUTLINE_YEAR,
	COLOR_OUTLINE_MONTH,
	COLOR_OUTLINE_WEEK,
	OUTLINE_BASE_LINE_WIDTH,
	OUTLINE_DAY_LINE_WIDTH_MULTIPLIER,
	OUTLINE_GROUP_LINE_WIDTH_MULTIPLIER,
	INITIAL_SCALE,
	MIN_SCALE,
	MAX_SCALE,
	ZOOM_IN_FACTOR,
	ZOOM_OUT_FACTOR,
	ANIMATION_DURATION_MS,
	ANIMATION_EASE_POWER,
} from "./constants";

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

	// Animation
	private animationRunning = false;
	private animationStartTime: number | null = null;
	private activeHighlightCount = 0;

	// Hover
	private hoveredDay: DateObj | null = null;
	private hoveredCellIndex: number | null = null;
	private hoverRafId: number | null = null;
	private pendingPointer: { x: number; y: number } | null = null;

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

	constructor(container: HTMLElement, config: CanvasEngineConfig) {
		this.container = container;
		this.config = { ...config };

		container.style.overflow = "hidden";
		container.style.touchAction = "none";
		container.style.backgroundColor = COLOR_BACKGROUND;

		this.staticCanvas = this.createCanvas();
		this.activeCanvas = this.createCanvas();
		this.overlayCanvas = this.createCanvas();

		container.appendChild(this.staticCanvas);
		container.appendChild(this.activeCanvas);
		container.appendChild(this.overlayCanvas);

		this.boundPointerDown = this.onPointerDown.bind(this);
		this.boundPointerMove = this.onPointerMove.bind(this);
		this.boundPointerUp = this.onPointerUp.bind(this);
		this.boundWheel = this.onWheel.bind(this);
		this.boundPointerLeave = this.onPointerLeave.bind(this);

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

	mount(): void {
		this.container.addEventListener("pointerdown", this.boundPointerDown);
		this.container.addEventListener("pointermove", this.boundPointerMove);
		this.container.addEventListener("pointerup", this.boundPointerUp);
		this.container.addEventListener("pointercancel", this.boundPointerUp);
		this.container.addEventListener("wheel", this.boundWheel, { passive: false });
		this.container.addEventListener("pointerleave", this.boundPointerLeave);

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
		if (this.hoverRafId !== null) cancelAnimationFrame(this.hoverRafId);
		if (this.repaintRafId !== null) cancelAnimationFrame(this.repaintRafId);
	}

	update(config: Partial<CanvasEngineConfig>): void {
		const prev = { ...this.config };
		Object.assign(this.config, config);

		const styleChanged = prev.collapseGridGap !== this.config.collapseGridGap;
		const structureChanged =
			prev.days !== this.config.days || prev.gridWidth !== this.config.gridWidth || styleChanged;

		if (styleChanged) this.updateCalendarStyle();
		if (structureChanged) this.rebuildLayout();
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

	private rebuildLayout(): void {
		this.gridLayout = createGridLayout(this.config.days, this.config.gridWidth, this.calendarStyle);
		if (this.gridLayout) {
			this.lodData = getLODData(this.gridLayout);
		}
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
		this.scale = INITIAL_SCALE;
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

			this.flushRepaint();

			if (this.animationRunning) {
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

		if (this.activeHighlightCount <= 0) return;

		const layout = this.gridLayout;
		const visible = this.getVisibleWorldRect();

		const startCol = Math.max(0, Math.floor((visible.left - layout.computedPaddingLeft) / layout.colStride));
		const endCol = Math.min(
			layout.numberOfCols - 1,
			Math.ceil((visible.right - layout.computedPaddingLeft) / layout.colStride)
		);
		const startRow = Math.max(0, Math.floor((visible.top - layout.paddingTop) / layout.rowStride));
		const maxActiveRow = Math.floor((this.activeHighlightCount - 1) / layout.numberOfCols);
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
				if (cellIndex >= this.activeHighlightCount) break;
				const x = layout.computedPaddingLeft + col * layout.colStride;
				const y = layout.paddingTop + row * layout.rowStride;
				ctx.rect(x, y, layout.cellWidth, layout.cellHeight);
			}
		}

		ctx.fill();
	}

	private cancelAnimation(): void {
		this.animationRunning = false;
		this.animationStartTime = null;
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

		if (!this.hoveredDay) return;

		this.setWorldTransform(ctx);

		const { startDate, days, gridWidth } = this.config;
		const style = this.calendarStyle;

		// Compensate line width so it's constant in screen pixels
		const lw = OUTLINE_BASE_LINE_WIDTH / this.scale;

		const cellIndex = diffDates(this.hoveredDay, startDate, "day");
		const dayBounds = getDayOutlineBounds(cellIndex, days, gridWidth, style);
		if (dayBounds) drawOutline(ctx, dayBounds, COLOR_OUTLINE_DAY, OUTLINE_DAY_LINE_WIDTH_MULTIPLIER * lw);

		const yearBounds = getOutlineBounds(startDate, this.hoveredDay, days, gridWidth, "year", style);
		if (yearBounds)
			drawMultiRowOutline(ctx, yearBounds, COLOR_OUTLINE_YEAR, OUTLINE_GROUP_LINE_WIDTH_MULTIPLIER * lw, "year");

		const monthBounds = getOutlineBounds(startDate, this.hoveredDay, days, gridWidth, "month", style);
		if (monthBounds)
			drawMultiRowOutline(
				ctx,
				monthBounds,
				COLOR_OUTLINE_MONTH,
				OUTLINE_GROUP_LINE_WIDTH_MULTIPLIER * lw,
				"month"
			);

		const weekBounds = getOutlineBounds(startDate, this.hoveredDay, days, gridWidth, "week", style);
		if (weekBounds)
			drawMultiRowOutline(ctx, weekBounds, COLOR_OUTLINE_WEEK, OUTLINE_GROUP_LINE_WIDTH_MULTIPLIER * lw, "week");
	}

	// --- Pointer / interaction ---

	private toCanvasPoint(clientX: number, clientY: number) {
		const rect = this.container.getBoundingClientRect();
		return {
			x: (clientX - rect.left - this.offset.x) / this.scale,
			y: (clientY - rect.top - this.offset.y) / this.scale,
		};
	}

	private updateHover(clientX: number, clientY: number): void {
		const point = this.toCanvasPoint(clientX, clientY);
		const cell = getCalendarCellFromPoint(this.calendarStyle, {
			numberOfCells: this.config.days,
			canvasWidth: this.config.gridWidth,
			pointX: point.x,
			pointY: point.y,
		});

		if (cell) {
			if (this.hoveredCellIndex === cell.cellIndex) return;

			this.hoveredCellIndex = cell.cellIndex;
			const currentDate = addDuration(this.config.startDate, cell.cellIndex, "day");
			this.hoveredDay = currentDate;

			useTooltipStore.getState().showTooltip(clientX, clientY, formatDate(currentDate, "YYYY-MM-DD"));
			useCanvasEngineStore.getState().setHoveredDate(currentDate);

			this.dirty.overlay = true;
			this.scheduleRepaint();
		}
	}

	private onPointerDown(e: PointerEvent): void {
		if (e.button !== 0) return;
		this.dragging = true;
		this.lastPointer = { x: e.clientX, y: e.clientY };
		this.container.setPointerCapture(e.pointerId);
	}

	private onPointerMove(e: PointerEvent): void {
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

	private onPointerUp(e: PointerEvent): void {
		this.dragging = false;
		this.container.releasePointerCapture(e.pointerId);
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
		this.hoveredDay = null;

		useTooltipStore.getState().setHidden(true);
		useCanvasEngineStore.getState().setHoveredDate(null);

		this.dirty.overlay = true;
		this.scheduleRepaint();
	}
}

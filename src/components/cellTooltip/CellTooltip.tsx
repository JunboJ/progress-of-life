import { useEffect, useRef } from "react";
import { useTooltipStore } from "../../store/tooltipStore";
import { calculateTooltipPosition } from "../../utils/tooltipPosition";
import { Tooltip } from "../shared/tooltip/Tooltip";

const TOOLTIP_SIZE = { width: 120, height: 45 };

export const CellTooltip = () => {
	const ref = useRef<HTMLDivElement>(null);
	const hidden = useTooltipStore((state) => state.hidden);
	const content = useTooltipStore((state) => state.content);

	// Subscribe to position changes outside React render cycle
	useEffect(() => {
		const unsubscribe = useTooltipStore.subscribe((state) => {
			if (!ref.current) return;
			const { x, y } = calculateTooltipPosition(state.positionX + 16, state.positionY + 16, TOOLTIP_SIZE);
			ref.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
		});
		return unsubscribe;
	}, []);

	return (
		<Tooltip ref={ref} hidden={hidden} content={content} width={TOOLTIP_SIZE.width} height={TOOLTIP_SIZE.height} />
	);
};

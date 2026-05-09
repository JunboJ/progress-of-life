import { forwardRef } from "react";
import styles from "./Tooltip.module.css";

interface TooltipProps {
	hidden: boolean;
	content: string;
	width: number;
	height: number;
}

export const Tooltip = forwardRef<HTMLDivElement, TooltipProps>(({ hidden, content, width, height }, ref) => {
	return (
		<div ref={ref} className={`${styles.tooltip} ${hidden ? styles.tooltipHidden : ""}`} style={{ width, height }}>
			<span>{content}</span>
		</div>
	);
});

export interface TooltipConfig {
	width: number;
	height: number;
}

export const calculateTooltipPosition = (
	positionX: number,
	positionY: number,
	config: TooltipConfig
): { x: number; y: number } => {
	const clientWidth = document.body.clientWidth;
	const scrollbarWidth = window.innerWidth - document.body.clientWidth;

	const calculatedPositionX =
		positionX + config.width > clientWidth - 16 ? clientWidth - config.width - scrollbarWidth : positionX;

	const calculatedPositionY =
		positionY + config.height > window.innerHeight ? window.innerHeight - config.height : positionY;

	return { x: calculatedPositionX, y: calculatedPositionY };
};

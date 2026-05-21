import { COLOR_CELL_ACTIVE, COLOR_CELL_INACTIVE } from "../../canvas/constants";
import { useDateModalStore } from "../../store/dateModalStore";
import { Modal } from "../shared/Modal";

export const DateModal = () => {
	const open = useDateModalStore((s) => s.open);
	const date = useDateModalStore((s) => s.date);
	const width = useDateModalStore((s) => s.width);
	const height = useDateModalStore((s) => s.height);
	const isActive = useDateModalStore((s) => s.isActive);
	const closeModal = useDateModalStore((s) => s.closeModal);

	return (
		<Modal
			open={open}
			title={date}
			onClose={closeModal}
			width={width}
			height={height}
			backgroundColor={isActive ? COLOR_CELL_ACTIVE : COLOR_CELL_INACTIVE}
		>
			<p>{date}</p>
		</Modal>
	);
};

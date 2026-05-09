import { useDateModalStore } from "../../store/dateModalStore";
import { Modal } from "../shared/Modal";

export const DateModal = () => {
	const open = useDateModalStore((s) => s.open);
	const date = useDateModalStore((s) => s.date);
	const closeModal = useDateModalStore((s) => s.closeModal);

	return (
		<Modal open={open} title={date} onClose={closeModal}>
			<p>{date}</p>
		</Modal>
	);
};

import { ReactNode } from "react";
import "./Modal.css";

interface ModalProps {
	open: boolean;
	title?: string;
	onClose: () => void;
	children: ReactNode;
	showCloseButton?: boolean;
}

const Modal = ({ open, title, onClose, children, showCloseButton = true }: ModalProps) => {
	if (!open) {
		return null;
	}

	return (
		<div className="modal-overlay" onClick={onClose}>
			<div className="modal-content" onClick={(event) => event.stopPropagation()}>
				<div className="modal-header">
					{title ? <h2>{title}</h2> : null}
					{showCloseButton ? (
						<button className="modal-close-btn" onClick={onClose}>
							×
						</button>
					) : null}
				</div>
				<div className="modal-body">{children}</div>
			</div>
		</div>
	);
};

export default Modal;

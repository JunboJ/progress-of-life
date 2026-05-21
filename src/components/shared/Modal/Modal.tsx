import { ReactNode } from "react";
import "./Modal.css";

interface ModalProps {
	open: boolean;
	title?: string;
	onClose: () => void;
	children: ReactNode;
	showCloseButton?: boolean;
	width?: number;
	height?: number;
	backgroundColor?: string;
	textColor?: string;
	variant?: "default" | "cell";
}

export const Modal = ({
	open,
	title,
	onClose,
	children,
	showCloseButton = true,
	width,
	height,
	backgroundColor = "#ffffff",
	textColor,
	variant = "default",
}: ModalProps) => {
	if (!open) {
		return null;
	}

	if (variant === "cell") {
		const resolvedTextColor = textColor ?? "#efefef";
		return (
			<div className="modal-overlay modal-overlay--cell" onClick={onClose}>
				<div
					className="modal-content modal-content--cell"
					onClick={(event) => event.stopPropagation()}
					style={{
						width,
						height,
						backgroundColor,
						color: resolvedTextColor,
					}}
				>
					{title ? <div className="modal-cell-title">{title}</div> : null}
					<div className="modal-body">{children}</div>
				</div>
			</div>
		);
	}

	return (
		<div className="modal-overlay" onClick={onClose}>
			<div
				className="modal-content"
				onClick={(event) => event.stopPropagation()}
				style={{ width, height, backgroundColor, color: textColor ?? "#1a1a1a" }}
			>
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

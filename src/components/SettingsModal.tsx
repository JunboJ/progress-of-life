import { useEffect, useState } from "react";
import { Dayjs } from "dayjs";
import Modal from "./Modal";
import "./SettingsModal.css";

interface SettingsModalProps {
  lifeSpan: number;
  dob: string;
  useTable: boolean;
  today: Dayjs;
  months: number;
  daysLived: number;
  onSave: (lifeSpan: number, dob: string, useTable: boolean) => void;
  autoOpen: boolean;
  onAutoOpenHandled: () => void;
}

const SettingsModal = ({
  lifeSpan,
  dob,
  useTable,
  today,
  months,
  daysLived,
  onSave,
  autoOpen,
  onAutoOpenHandled,
}: SettingsModalProps) => {
  const [open, setOpen] = useState(false);
  const [draftLifeSpan, setDraftLifeSpan] = useState<number>(lifeSpan);
  const [draftDob, setDraftDob] = useState(dob);
  const [draftUseTable, setDraftUseTable] = useState(useTable);

  useEffect(() => {
    if (open) {
      setDraftLifeSpan(lifeSpan);
      setDraftDob(dob);
      setDraftUseTable(useTable);
    }
  }, [open, lifeSpan, dob, useTable]);

  useEffect(() => {
    if (autoOpen && !open) {
      setOpen(true);
      onAutoOpenHandled();
    }
  }, [autoOpen, onAutoOpenHandled, open]);

  const close = () => setOpen(false);

  const save = () => {
    onSave(Math.max(1, Math.floor(draftLifeSpan)), draftDob, draftUseTable);
    close();
  };

  return (
    <>
      <button className="floating-settings-button" onClick={() => setOpen(true)}>
        ⚙️ Settings
      </button>

      <Modal open={open} title="App Settings" onClose={close}>
        <div className="settings-field">
          <label>Life span (years)</label>
          <input
            type="number"
            min={1}
            value={draftLifeSpan}
            onChange={(e) => setDraftLifeSpan(Number(e.target.value))}
          />
        </div>

        <div className="settings-field">
          <label>Date of birth</label>
          <input
            type="date"
            value={draftDob}
            onChange={(e) => setDraftDob(e.target.value)}
            max={today.format("YYYY-MM-DD")}
          />
        </div>

        {!dob ? (
          <div className="settings-warning">
            Please enter your date of birth to unlock the life progress canvas.
          </div>
        ) : null}

        <div className="settings-field settings-switch-row">
          <label>
            <input
              type="checkbox"
              checked={draftUseTable}
              onChange={(e) => setDraftUseTable(e.target.checked)}
            />
            Use Table Grid System
          </label>
        </div>

        <div className="settings-summary">
          <span>months lived: {months}</span>
          <span>days lived: {daysLived}</span>
        </div>

        <div className="settings-footer">
          <button type="button" className="button button-secondary" onClick={close}>
            Cancel
          </button>
          <button type="button" className="button button-primary" onClick={save}>
            Save
          </button>
        </div>
      </Modal>
    </>
  );
};

export default SettingsModal;

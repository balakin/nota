import { useEffect, useRef } from 'react';

/**
 * A modal built on the native `<dialog>`, so focus trapping, Escape and the top layer come from
 * the platform. It is only mounted while `open`, which keeps the dialog's own state trivial.
 */
export function ConfirmDialog({
  title,
  body,
  confirmLabel,
  cancelLabel,
  tone = 'default',
  onConfirm,
  onCancel,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  tone?: 'default' | 'danger';
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      className="confirm-dialog"
      /* Escape and the backdrop both close it; either is a cancel. */
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
      onClick={(event) => {
        if (event.target === ref.current) onCancel();
      }}
    >
      <h2>{title}</h2>
      <p>{body}</p>
      <div className="confirm-actions">
        <button
          type="button"
          className="button button-secondary"
          onClick={onCancel}
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          className={`button ${tone === 'danger' ? 'button-danger' : 'button-primary'}`}
          onClick={onConfirm}
        >
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}

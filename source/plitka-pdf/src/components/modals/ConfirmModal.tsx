type ConfirmModalProps = {
  title?: string;
  message: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'default' | 'danger';
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmModal({
  title,
  message,
  description,
  confirmLabel = 'Подтвердить',
  cancelLabel = 'Отмена',
  tone = 'default',
  onConfirm,
  onCancel
}: ConfirmModalProps) {
  return (
    <div className="modal-backdrop confirm-backdrop" role="presentation" onMouseDown={onCancel}>
      <section
        className={`confirm-modal tone-${tone}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="confirm-modal-body">
          <h2 id="confirm-modal-title">{title ?? message}</h2>
          {description && <p>{description}</p>}
        </div>
        <div className="confirm-modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onCancel}>{cancelLabel}</button>
          <button type="button" className="btn btn-primary" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </section>
    </div>
  );
}

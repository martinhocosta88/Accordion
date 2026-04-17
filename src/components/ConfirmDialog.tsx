import { useEffect, useRef } from 'react';
import { useEscapeKey } from '../hooks/useEscapeKey';

interface ConfirmDialogProps {
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel?: () => void;
}

export function ConfirmDialog({
  message,
  confirmLabel = 'Confirm',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const firstBtnRef = useRef<HTMLButtonElement>(null);
  const dismiss = onCancel ?? onConfirm;

  useEffect(() => {
    firstBtnRef.current?.focus();
  }, []);

  useEscapeKey(dismiss);

  return (
    <div className="settings-overlay" onClick={dismiss}>
      <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
        <p className="confirm-dialog-message">{message}</p>
        <div className="confirm-dialog-actions">
          {onCancel && (
            <button ref={firstBtnRef} className="confirm-dialog-cancel" onClick={onCancel}>
              Cancel
            </button>
          )}
          <button
            ref={onCancel ? undefined : firstBtnRef}
            className="confirm-dialog-confirm"
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

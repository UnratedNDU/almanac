import { useEffect, useId, useRef, type FormEvent, type ReactNode } from "react";
import { t } from "../i18n/es";
import { Icon } from "./Icon";

interface SheetProps {
  title: string;
  /** Called once the sheet is really closing. */
  onClose: () => void;
  /** Called when the user asks to close (close button, Escape, backdrop). Defaults to `onClose`; use it to confirm first. */
  onRequestClose?: () => void;
  children: ReactNode;
  footer?: ReactNode;
  /** When given, the sheet is a form and this runs on submit. */
  onSubmit?: (event: FormEvent) => void;
}

/** A modal dialog on the native `<dialog>`: focus is trapped, the page behind is inert, and Escape asks to close. */
export function Sheet({ title, onClose, onRequestClose, children, footer, onSubmit }: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const requestClose = onRequestClose ?? onClose;

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  const content = (
    <>
      <header className="sheet__head">
        <h2 id={titleId}>{title}</h2>
        <button type="button" className="icon-btn" aria-label={t.editor.close} onClick={requestClose}>
          <Icon name="close" />
        </button>
      </header>
      <div className="sheet__body">{children}</div>
      {footer && <footer className="sheet__foot">{footer}</footer>}
    </>
  );

  return (
    <dialog
      ref={ref}
      className="sheet"
      aria-labelledby={titleId}
      onCancel={(event) => {
        // Escape: keep the dialog open and let the owner decide.
        event.preventDefault();
        requestClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) requestClose();
      }}
    >
      {onSubmit ? (
        <form className="sheet__form" onSubmit={onSubmit} noValidate>
          {content}
        </form>
      ) : (
        <div className="sheet__form">{content}</div>
      )}
    </dialog>
  );
}
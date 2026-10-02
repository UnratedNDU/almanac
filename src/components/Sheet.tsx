import { useEffect, useId, useRef, type FormEvent, type ReactNode } from "react";
import { t } from "../i18n/es";
import { Icon } from "./Icon";

interface SheetProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  /** When given, the sheet is a form and this runs on submit. */
  onSubmit?: (event: FormEvent) => void;
}

/** A modal dialog on the native `<dialog>`: focus is trapped, Escape closes it and the page behind is inert. */
export function Sheet({ title, onClose, children, footer, onSubmit }: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  const content = (
    <>
      <header className="sheet__head">
        <h2 id={titleId}>{title}</h2>
        <button type="button" className="icon-btn" aria-label={t.editor.close} onClick={() => ref.current?.close()}>
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
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) ref.current?.close();
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
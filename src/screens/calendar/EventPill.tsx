import type { CSSProperties } from "react";
import { KindIcon } from "../../components/KindIcon";
import { t } from "../../i18n/es";
import { clock } from "../../lib/format";
import type { OccurrenceView } from "../../types";

interface EventPillProps {
  occurrence: OccurrenceView;
  color: string;
  onOpen: (occurrence: OccurrenceView) => void;
}

export function EventPill({ occurrence: o, color, onOpen }: EventPillProps) {
  const title = o.title || t.cal.untitled;
  return (
    <button
      type="button"
      className="pill"
      style={{ "--c": color } as CSSProperties}
      title={o.allDay ? title : `${clock(o.start)} – ${title}`}
      onClick={(event) => {
        event.stopPropagation();
        onOpen(o);
      }}
    >
      <KindIcon kind={o.kind} />
      {!o.allDay && <span className="pill__time">{clock(o.start)}</span>}
      <span className="pill__title">{title}</span>
    </button>
  );
}
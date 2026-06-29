"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import Link from "next/link";
import { Lead } from "@/lib/types";
import { formatCurrency, formatDate, isOverdue, isToday } from "@/lib/format";
import { SOURCE_LABEL } from "@/lib/domain";

export default function KanbanCard({ lead }: { lead: Lead }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: lead.id });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
  };

  const overdue = isOverdue(lead.nextFollowUp);
  const today = isToday(lead.nextFollowUp);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white rounded-lg border border-slate-200 p-3 shadow-sm hover:shadow-md transition cursor-grab active:cursor-grabbing"
      {...attributes}
      {...listeners}
    >
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/leads/${lead.id}`}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          className="font-medium text-slate-800 text-sm hover:text-brand-600 hover:underline"
        >
          {lead.name}
        </Link>
        {lead.inactive && <span title="Lead inativo" className="text-amber-500">💤</span>}
      </div>

      <p className="text-xs text-slate-500 mt-0.5">{lead.product}</p>
      <p className="text-sm font-semibold text-slate-700 mt-1">{formatCurrency(lead.estimatedValue)}</p>

      <div className="flex items-center justify-between mt-2 text-xs">
        <span className="text-slate-400">{SOURCE_LABEL[lead.source]}</span>
        <span
          className={
            overdue ? "text-red-600 font-medium" : today ? "text-amber-600 font-medium" : "text-slate-400"
          }
          title="Proximo follow-up"
        >
          {overdue ? "⚠️ " : today ? "📅 " : ""}{formatDate(lead.nextFollowUp)}
        </span>
      </div>

      {lead.owner && <p className="text-[11px] text-slate-400 mt-1">👤 {lead.owner.name}</p>}
    </div>
  );
}

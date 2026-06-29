"use client";

import { useDroppable } from "@dnd-kit/core";
import { Lead, LeadStatus } from "@/lib/types";
import { STATUS_COLOR, STATUS_LABEL } from "@/lib/domain";
import { formatCurrency } from "@/lib/format";
import KanbanCard from "./KanbanCard";

export default function KanbanColumn({ status, leads }: { status: LeadStatus; leads: Lead[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const c = STATUS_COLOR[status];
  const total = leads.reduce((acc, l) => acc + l.estimatedValue, 0);

  return (
    <div className="flex flex-col w-72 shrink-0">
      <div className={`rounded-t-lg px-3 py-2 border-t-4 ${c.border} bg-white`} style={{ borderTopColor: undefined }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${c.dot}`} />
            <span className="font-semibold text-sm text-slate-700">{STATUS_LABEL[status]}</span>
            <span className="text-xs text-slate-400">({leads.length})</span>
          </div>
        </div>
        <p className="text-xs text-slate-400 mt-0.5">{formatCurrency(total)}</p>
      </div>

      <div
        ref={setNodeRef}
        className={`flex-1 min-h-[200px] rounded-b-lg p-2 space-y-2 overflow-y-auto scroll-thin transition-colors ${
          isOver ? "bg-brand-50 ring-2 ring-brand-300" : "bg-slate-100"
        }`}
      >
        {leads.map((lead) => (
          <KanbanCard key={lead.id} lead={lead} />
        ))}
        {leads.length === 0 && <p className="text-xs text-slate-400 text-center py-6">Sem leads</p>}
      </div>
    </div>
  );
}

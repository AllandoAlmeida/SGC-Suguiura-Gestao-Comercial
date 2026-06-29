"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, useSensor, useSensors,
} from "@dnd-kit/core";
import PageHeader from "@/components/PageHeader";
import LeadForm from "@/components/LeadForm";
import KanbanColumn from "@/components/kanban/KanbanColumn";
import { apiFetch } from "@/lib/client";
import { Lead, LeadStatus, UserLite } from "@/lib/types";
import { STATUS_ORDER } from "@/lib/domain";
import { formatCurrency } from "@/lib/format";

export default function PipelinePage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [users, setUsers] = useState<UserLite[]>([]);
  const [ownerFilter, setOwnerFilter] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "error" | "ok" } | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  async function load() {
    const params = new URLSearchParams();
    if (ownerFilter) params.set("ownerId", ownerFilter);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const data = await apiFetch<Lead[]>(`/api/leads?${params.toString()}`);
    setLeads(data);
  }

  useEffect(() => {
    apiFetch<UserLite[]>("/api/users").then(setUsers).catch(() => {});
  }, []);

  useEffect(() => {
    load().catch((e) => showToast(e.message, "error"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerFilter, from, to]);

  function showToast(msg: string, type: "error" | "ok") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }

  const byStatus = useMemo(() => {
    const map: Record<LeadStatus, Lead[]> = {
      NOVO: [], QUALIFICADO: [], ORCAMENTO: [], NEGOCIACAO: [], FECHADO: [], PERDIDO: [],
    };
    for (const l of leads) map[l.status].push(l);
    return map;
  }, [leads]);

  const activeLead = leads.find((l) => l.id === activeId) ?? null;

  function handleDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  async function handleDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const leadId = String(active.id);
    const newStatus = String(over.id) as LeadStatus;
    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.status === newStatus) return;

    const prevStatus = lead.status;
    // Atualizacao otimista.
    setLeads((cur) => cur.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l)));

    try {
      await apiFetch(`/api/leads/${leadId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      showToast(`Lead movido para ${newStatus}.`, "ok");
    } catch (err) {
      // Reverte em caso de regra violada / permissao.
      setLeads((cur) => cur.map((l) => (l.id === leadId ? { ...l, status: prevStatus } : l)));
      showToast(err instanceof Error ? err.message : "Erro ao mover lead", "error");
    }
  }

  const totalPipeline = leads
    .filter((l) => !["FECHADO", "PERDIDO"].includes(l.status))
    .reduce((acc, l) => acc + l.estimatedValue, 0);

  return (
    <div className="p-6 lg:p-8 h-screen flex flex-col">
      <PageHeader
        title="Pipeline Comercial"
        subtitle={`Funil de vendas em formato Kanban — ${formatCurrency(totalPipeline)} em aberto`}
        action={
          <button onClick={() => setShowForm(true)} className="px-4 py-2 rounded-lg bg-brand-600 text-white hover:bg-brand-700 text-sm">
            + Novo lead
          </button>
        }
      />

      <div className="flex flex-wrap gap-3 mb-4">
        <select value={ownerFilter} onChange={(e) => setOwnerFilter(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm">
          <option value="">Todos atendentes</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
        <label className="flex items-center gap-1 text-sm text-slate-600">
          De <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
        </label>
        <label className="flex items-center gap-1 text-sm text-slate-600">
          Ate <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
        </label>
        {(ownerFilter || from || to) && (
          <button onClick={() => { setOwnerFilter(""); setFrom(""); setTo(""); }} className="text-sm text-slate-500 hover:text-slate-700 underline">
            Limpar filtros
          </button>
        )}
      </div>

      {toast && (
        <div className={`mb-3 rounded-lg px-4 py-2 text-sm ${toast.type === "error" ? "bg-red-50 text-red-700 border border-red-200" : "bg-green-50 text-green-700 border border-green-200"}`}>
          {toast.msg}
        </div>
      )}

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-4 scroll-thin flex-1">
          {STATUS_ORDER.map((status) => (
            <KanbanColumn key={status} status={status} leads={byStatus[status]} />
          ))}
        </div>
        <DragOverlay>
          {activeLead ? (
            <div className="bg-white rounded-lg border border-brand-400 p-3 shadow-lg w-72 rotate-2">
              <p className="font-medium text-slate-800 text-sm">{activeLead.name}</p>
              <p className="text-xs text-slate-500">{activeLead.product}</p>
              <p className="text-sm font-semibold text-slate-700 mt-1">{formatCurrency(activeLead.estimatedValue)}</p>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {showForm && (
        <LeadForm
          users={users}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load(); }}
        />
      )}
    </div>
  );
}

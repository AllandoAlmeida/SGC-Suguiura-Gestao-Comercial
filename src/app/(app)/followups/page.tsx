"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import { apiFetch } from "@/lib/client";
import { Lead } from "@/lib/types";
import { formatCurrency, formatDate, isOverdue, isToday } from "@/lib/format";

export default function FollowupsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [error, setError] = useState("");

  function load() {
    apiFetch<Lead[]>("/api/leads").then(setLeads).catch((e) => setError(e.message));
  }

  useEffect(() => { load(); }, []);

  // Apenas leads ainda em aberto (nao fechados/perdidos) tem follow-up ativo.
  const open = useMemo(() => leads.filter((l) => !["FECHADO", "PERDIDO"].includes(l.status)), [leads]);

  const overdue = open.filter((l) => isOverdue(l.nextFollowUp));
  const today = open.filter((l) => isToday(l.nextFollowUp));
  const upcoming = open
    .filter((l) => !isOverdue(l.nextFollowUp) && !isToday(l.nextFollowUp))
    .sort((a, b) => new Date(a.nextFollowUp).getTime() - new Date(b.nextFollowUp).getTime())
    .slice(0, 20);

  async function markContacted(lead: Lead) {
    try {
      await apiFetch(`/api/leads/${lead.id}/interactions`, {
        method: "POST",
        body: JSON.stringify({ type: "LIGACAO", content: "Contato de follow-up realizado." }),
      });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
    }
  }

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Follow-ups" subtitle="Disciplina de acompanhamento — nenhum lead pode ficar sem contato" />

      {error && <p className="text-red-600 mb-3">{error}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-6">
        <SummaryCard label="Atrasados" value={overdue.length} tone="red" />
        <SummaryCard label="Para hoje" value={today.length} tone="amber" />
        <SummaryCard label="Proximos (em aberto)" value={upcoming.length} tone="slate" />
      </div>

      <Section title="⚠️ Follow-ups atrasados" leads={overdue} onContacted={markContacted} emptyMsg="Nenhum follow-up atrasado. Otimo trabalho!" />
      <Section title="📅 Contatos de hoje" leads={today} onContacted={markContacted} emptyMsg="Nenhum contato agendado para hoje." />
      <Section title="🗓️ Proximos follow-ups" leads={upcoming} onContacted={markContacted} emptyMsg="Nada agendado." />
    </div>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value: number; tone: "red" | "amber" | "slate" }) {
  const tones = {
    red: "bg-red-50 border-red-200 text-red-700",
    amber: "bg-amber-50 border-amber-200 text-amber-700",
    slate: "bg-white border-slate-200 text-slate-700",
  };
  return (
    <div className={`rounded-xl border p-5 ${tones[tone]}`}>
      <p className="text-sm opacity-80">{label}</p>
      <p className="text-3xl font-bold mt-1">{value}</p>
    </div>
  );
}

function Section({
  title, leads, emptyMsg, onContacted,
}: {
  title: string;
  leads: Lead[];
  emptyMsg: string;
  onContacted: (lead: Lead) => void;
}) {
  return (
    <div className="mb-8">
      <h2 className="font-semibold text-slate-800 mb-3">{title} <span className="text-slate-400 font-normal">({leads.length})</span></h2>
      {leads.length === 0 ? (
        <p className="text-sm text-slate-400">{emptyMsg}</p>
      ) : (
        <div className="space-y-2">
          {leads.map((lead) => (
            <div key={lead.id} className="bg-white rounded-lg border border-slate-200 p-4 flex items-center gap-4 shadow-sm">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Link href={`/leads/${lead.id}`} className="font-medium text-slate-800 hover:text-brand-600 hover:underline truncate">
                    {lead.name}
                  </Link>
                  <StatusBadge status={lead.status} />
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{lead.phone} · {lead.product} · {formatCurrency(lead.estimatedValue)}</p>
              </div>
              <div className="text-right">
                <p className={`text-sm font-medium ${isOverdue(lead.nextFollowUp) ? "text-red-600" : "text-slate-700"}`}>
                  {formatDate(lead.nextFollowUp)}
                </p>
                <p className="text-xs text-slate-400">{lead.owner?.name}</p>
              </div>
              <button onClick={() => onContacted(lead)} className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-sm hover:bg-green-700 whitespace-nowrap">
                ✓ Contatei
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

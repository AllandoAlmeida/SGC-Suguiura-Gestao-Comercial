"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import LeadForm from "@/components/LeadForm";
import { apiFetch } from "@/lib/client";
import { Lead, LeadStatus, UserLite } from "@/lib/types";
import { STATUS_ORDER, STATUS_LABEL, SOURCE_LABEL } from "@/lib/domain";
import { formatCurrency, formatDate, isOverdue } from "@/lib/format";

export default function LeadsPage() {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const [leads, setLeads] = useState<Lead[]>([]);
  const [users, setUsers] = useState<UserLite[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Lead | null>(null);
  const [error, setError] = useState("");

  async function load() {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (statusFilter) params.set("status", statusFilter);
    if (sourceFilter) params.set("source", sourceFilter);
    const data = await apiFetch<Lead[]>(`/api/leads?${params.toString()}`);
    setLeads(data);
  }

  useEffect(() => {
    apiFetch<UserLite[]>("/api/users").then(setUsers).catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load().catch((e) => setError(e.message)), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter, sourceFilter]);

  async function handleDelete(lead: Lead) {
    if (!confirm(`Excluir o lead "${lead.name}"?`)) return;
    try {
      await apiFetch(`/api/leads/${lead.id}`, { method: "DELETE" });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao excluir");
    }
  }

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        title="Gestao de Leads"
        subtitle={`${leads.length} lead(s) encontrado(s)`}
        action={
          <button onClick={() => { setEditing(null); setShowForm(true); }} className="px-4 py-2 rounded-lg bg-brand-600 text-white hover:bg-brand-700 text-sm">
            + Novo lead
          </button>
        }
      />

      <div className="flex flex-wrap gap-3 mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome, telefone ou produto..."
          className="flex-1 min-w-[220px] rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
          <option value="">Todos os status</option>
          {STATUS_ORDER.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
        <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
          <option value="">Todas as origens</option>
          {Object.entries(SOURCE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {error && <p className="text-red-600 mb-3">{error}</p>}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-left">
            <tr>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Origem</th>
              <th className="px-4 py-3">Produto</th>
              <th className="px-4 py-3 text-right">Valor</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Responsavel</th>
              <th className="px-4 py-3">Follow-up</th>
              <th className="px-4 py-3 text-right">Acoes</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr key={lead.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link href={`/leads/${lead.id}`} className="font-medium text-slate-800 hover:text-brand-600 hover:underline">
                    {lead.name}
                  </Link>
                  <div className="text-xs text-slate-400">{lead.phone}{lead.inactive ? " · 💤 inativo" : ""}</div>
                </td>
                <td className="px-4 py-3 text-slate-600">{SOURCE_LABEL[lead.source]}</td>
                <td className="px-4 py-3 text-slate-600">{lead.product}</td>
                <td className="px-4 py-3 text-right font-medium">{formatCurrency(lead.estimatedValue)}</td>
                <td className="px-4 py-3"><StatusBadge status={lead.status} /></td>
                <td className="px-4 py-3 text-slate-600">{lead.owner?.name ?? "-"}</td>
                <td className={`px-4 py-3 ${isOverdue(lead.nextFollowUp) && !["FECHADO","PERDIDO"].includes(lead.status) ? "text-red-600 font-medium" : "text-slate-600"}`}>
                  {formatDate(lead.nextFollowUp)}
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <button onClick={() => { setEditing(lead); setShowForm(true); }} className="text-brand-600 hover:underline mr-3">
                    Editar
                  </button>
                  {role !== "SDR" && (
                    <button onClick={() => handleDelete(lead)} className="text-red-600 hover:underline">
                      Excluir
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {leads.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-400">Nenhum lead encontrado.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <LeadForm
          lead={editing}
          users={users}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load(); }}
        />
      )}
    </div>
  );
}

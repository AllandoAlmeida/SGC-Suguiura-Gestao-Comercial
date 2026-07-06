"use client";

import { useEffect, useRef, useState } from "react";
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
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    created: number;
    errors: { row: number; reason: string }[];
  } | null>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  // Mesma logica de filtros usada no load(), reaproveitada para os links de exportacao
  // — assim o relatorio baixado bate exatamente com o que esta na tela.
  function buildFilterParams() {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (statusFilter) params.set("status", statusFilter);
    if (sourceFilter) params.set("source", sourceFilter);
    return params;
  }

  async function load() {
    const data = await apiFetch<Lead[]>(
      `/api/leads?${buildFilterParams().toString()}`,
    );
    setLeads(data);
  }

  useEffect(() => {
    apiFetch<UserLite[]>("/api/users")
      .then(setUsers)
      .catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load().catch((e) => setError(e.message)), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter, sourceFilter]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        exportMenuRef.current &&
        !exportMenuRef.current.contains(e.target as Node)
      ) {
        setShowExportMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // permite selecionar o mesmo arquivo de novo depois
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    try {
      const text = await file.text();
      const result = await apiFetch<{
        created: number;
        errors: { row: number; reason: string }[];
      }>("/api/leads/import", {
        method: "POST",
        body: JSON.stringify({ csv: text }),
      });
      setImportResult(result);
      load();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erro ao importar arquivo.",
      );
    } finally {
      setImporting(false);
    }
  }

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
    <div className="h-screen flex flex-col p-6 lg:p-8 overflow-hidden">
      {/* Bloco fixo */}
      <div className="shrink-0">
        <PageHeader
          title="Gestão de Leads"
          subtitle={`${leads.length} lead(s) encontrado(s)`}
          action={
            <div className="flex items-center gap-4">
              <div>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  ref={importInputRef}
                  onChange={handleImportFile}
                  className="hidden"
                />
                <button
                  onClick={() => importInputRef.current?.click()}
                  disabled={importing}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-sm disabled:opacity-60"
                >
                  {importing ? "Importando..." : "Importar dados"}
                </button>
              </div>

              <div className="relative" ref={exportMenuRef}>
                <button
                  onClick={() => setShowExportMenu((v) => !v)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-sm"
                >
                  Exportar dados ▾
                </button>
                {showExportMenu && (
                  <div className="absolute right-0 mt-2 w-44 bg-white border border-slate-200 rounded-lg shadow-lg z-10 overflow-hidden">
                    <a
                      href={`/api/leads/report/pdf?${buildFilterParams().toString()}`}
                      className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                      onClick={() => setShowExportMenu(false)}
                    >
                      Exportar PDF
                    </a>
                    <a
                      href={`/api/leads/report/csv?${buildFilterParams().toString()}`}
                      className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                      onClick={() => setShowExportMenu(false)}
                    >
                      Exportar CSV
                    </a>
                  </div>
                )}
              </div>

              <button
                onClick={() => {
                  setEditing(null);
                  setShowForm(true);
                }}
                className="px-4 py-2 rounded-lg bg-brand-600 text-white hover:bg-brand-700 text-sm"
              >
                + Novo lead
              </button>
            </div>
          }
        />

        {importResult && (
          <div className="mb-4 rounded-lg border p-3 text-sm">...</div>
        )}

        <div className="flex flex-wrap gap-3 mb-4">{/* filtros */}</div>

        {error && <p className="text-red-600 mb-3">{error}</p>}
      </div>

      {/* Apenas essa área rola */}
      <div className="flex-1 min-h-0 overflow-y-auto bg-white rounded-xl border border-slate-200 shadow-sm">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-slate-50 text-slate-500 text-left">
            <tr>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Canal</th>
              <th className="px-4 py-3">Produto</th>
              <th className="px-4 py-3 text-center">Valor</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Responsável</th>
              <th className="px-4 py-3">Follow-up</th>
              <th className="px-4 py-3 text-center">Ações</th>
            </tr>
          </thead>

          <tbody>
            {leads.map((lead) => (
              <tr
                key={lead.id}
                className="border-t border-slate-100 hover:bg-slate-50"
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/leads/${lead.id}`}
                    className="font-medium text-slate-800 hover:text-brand-600 hover:underline"
                  >
                    {lead.name}
                  </Link>
                  <div className="text-xs text-slate-400">
                    {lead.phone}
                    {lead.inactive ? " · 💤 inativo" : ""}
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {SOURCE_LABEL[lead.source]}
                </td>
                <td className="px-4 py-3 text-slate-600">{lead.product}</td>
                <td className="px-4 py-3 text-center font-medium">
                  {formatCurrency(lead.estimatedValue)}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={lead.status} />
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {lead.owner?.name ?? "-"}
                </td>
                <td
                  className={`px-4 py-3 ${isOverdue(lead.nextFollowUp) && !["FECHADO", "PERDIDO"].includes(lead.status) ? "text-red-600 font-medium" : "text-slate-600"}`}
                >
                  {formatDate(lead.nextFollowUp)}
                </td>
                <td className="px-4 py-3 text-left whitespace-nowrap">
                  <button
                    onClick={() => {
                      setEditing(lead);
                      setShowForm(true);
                    }}
                    className="text-brand-600 hover:underline mr-3"
                  >
                    Editar
                  </button>
                  {role !== "SDR" && (
                    <button
                      onClick={() => handleDelete(lead)}
                      className="text-red-600 hover:underline"
                    >
                      Excluir
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {leads.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-10 text-center text-slate-400"
                >
                  Nenhum lead encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <LeadForm
          lead={editing}
          users={users}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            load();
          }}
        />
      )}
    </div>
  );
}

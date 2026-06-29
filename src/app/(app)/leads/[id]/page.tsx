"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import LeadForm from "@/components/LeadForm";
import { apiFetch } from "@/lib/client";
import { LeadWithInteractions, Interaction, InteractionType, UserLite } from "@/lib/types";
import { SOURCE_LABEL, STATUS_LABEL } from "@/lib/domain";
import { formatCurrency, formatDate, formatDateTime, isOverdue } from "@/lib/format";

const TYPE_META: Record<InteractionType, { label: string; icon: string }> = {
  MENSAGEM: { label: "Mensagem", icon: "💬" },
  LIGACAO: { label: "Ligacao", icon: "📞" },
  NOTA: { label: "Nota", icon: "📝" },
  MUDANCA_STATUS: { label: "Mudanca de status", icon: "🔄" },
};

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [lead, setLead] = useState<LeadWithInteractions | null>(null);
  const [users, setUsers] = useState<UserLite[]>([]);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);

  const [type, setType] = useState<InteractionType>("LIGACAO");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const data = await apiFetch<LeadWithInteractions>(`/api/leads/${id}`);
    setLead(data);
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
    apiFetch<UserLite[]>("/api/users").then(setUsers).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function addInteraction(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setSaving(true);
    try {
      await apiFetch(`/api/leads/${id}/interactions`, {
        method: "POST",
        body: JSON.stringify({ type, content }),
      });
      setContent("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao registrar");
    } finally {
      setSaving(false);
    }
  }

  if (error) return <div className="p-8 text-red-600">{error}</div>;
  if (!lead) return <div className="p-8 text-slate-500">Carregando...</div>;

  const overdue = isOverdue(lead.nextFollowUp) && !["FECHADO", "PERDIDO"].includes(lead.status);

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-2">
        <Link href="/leads" className="text-sm text-slate-500 hover:text-slate-700">← Voltar para leads</Link>
      </div>
      <PageHeader
        title={lead.name}
        subtitle={`${lead.phone} · ${SOURCE_LABEL[lead.source]}`}
        action={
          <button onClick={() => setShowForm(true)} className="px-4 py-2 rounded-lg bg-brand-600 text-white hover:bg-brand-700 text-sm">
            Editar lead
          </button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna de dados */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Status</span>
              <StatusBadge status={lead.status} />
            </div>
            <Info label="Produto" value={lead.product} />
            <Info label="Valor estimado" value={formatCurrency(lead.estimatedValue)} />
            <Info label="Responsavel" value={lead.owner?.name ?? "-"} />
            <Info label="Data de entrada" value={formatDate(lead.entryDate)} />
            <Info label="Ultimo contato" value={formatDate(lead.lastContact)} />
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Proximo follow-up</span>
              <span className={`text-sm font-medium ${overdue ? "text-red-600" : "text-slate-800"}`}>
                {overdue ? "⚠️ " : ""}{formatDate(lead.nextFollowUp)}
              </span>
            </div>
            {lead.inactive && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-xs px-3 py-2">
                💤 Lead sinalizado como inativo (sem contato recente).
              </div>
            )}
          </div>

          {lead.notes && (
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-700 mb-2">Observacoes</h3>
              <p className="text-sm text-slate-600 whitespace-pre-wrap">{lead.notes}</p>
            </div>
          )}
        </div>

        {/* Coluna de historico */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <h3 className="font-semibold text-slate-800 mb-3">Registrar interacao</h3>
            <form onSubmit={addInteraction} className="flex flex-col gap-3">
              <div className="flex gap-2">
                {(["LIGACAO", "MENSAGEM", "NOTA"] as InteractionType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={`px-3 py-1.5 rounded-lg text-sm border ${type === t ? "bg-brand-600 text-white border-brand-600" : "border-slate-300 text-slate-600 hover:bg-slate-50"}`}
                  >
                    {TYPE_META[t].icon} {TYPE_META[t].label}
                  </button>
                ))}
              </div>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={2}
                placeholder="Descreva o contato realizado..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <div className="flex justify-end">
                <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-brand-600 text-white hover:bg-brand-700 text-sm disabled:opacity-60">
                  {saving ? "Registrando..." : "Registrar"}
                </button>
              </div>
            </form>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <h3 className="font-semibold text-slate-800 mb-4">Historico de interacoes</h3>
            <ol className="relative border-l border-slate-200 ml-2 space-y-5">
              {lead.interactions.map((it: Interaction) => (
                <li key={it.id} className="ml-4">
                  <span className="absolute -left-[7px] flex h-3.5 w-3.5 items-center justify-center rounded-full bg-brand-500" />
                  <div className="flex items-center gap-2 text-sm">
                    <span>{TYPE_META[it.type].icon}</span>
                    <span className="font-medium text-slate-700">{TYPE_META[it.type].label}</span>
                    {it.type === "MUDANCA_STATUS" && it.fromStatus && it.toStatus && (
                      <span className="text-xs text-slate-400">
                        {STATUS_LABEL[it.fromStatus]} → {STATUS_LABEL[it.toStatus]}
                      </span>
                    )}
                    <span className="text-xs text-slate-400 ml-auto">{formatDateTime(it.createdAt)}</span>
                  </div>
                  <p className="text-sm text-slate-600 mt-0.5">{it.content}</p>
                  <p className="text-xs text-slate-400">por {it.user?.name ?? "-"}</p>
                </li>
              ))}
              {lead.interactions.length === 0 && <p className="text-sm text-slate-400 ml-2">Nenhuma interacao registrada.</p>}
            </ol>
          </div>
        </div>
      </div>

      {showForm && (
        <LeadForm
          lead={lead}
          users={users}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load(); }}
        />
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm font-medium text-slate-800">{value}</span>
    </div>
  );
}

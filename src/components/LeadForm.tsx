"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/client";
import { Lead, LeadStatus, LeadSource, UserLite, Role } from "@/lib/types";
import { toDateInput } from "@/lib/format";
import {
  STATUS_ORDER,
  STATUS_LABEL,
  SOURCE_LABEL,
  canEditLeadStatus,
  isValidStatusTransition,
} from "@/lib/domain";

interface Props {
  lead?: Lead | null;
  users: UserLite[];
  onClose: () => void;
  onSaved: () => void;
}

const SOURCES: LeadSource[] = [
  "WHATSAPP",
  "LOJA",
  "EMAIL",
  "PROSPECCAO",
  "POS_VENDA",
];

export default function LeadForm({ lead, users, onClose, onSaved }: Props) {
  const { data: session } = useSession();
  const role = (session?.user?.role ?? "SDR") as Role;
  const isEdit = Boolean(lead);

  const [form, setForm] = useState({
    name: lead?.name ?? "",
    phone: lead?.phone ?? "",
    source: (lead?.source ?? "WHATSAPP") as LeadSource,
    product: lead?.product ?? "",
    estimatedValue: lead?.estimatedValue?.toString() ?? "",
    status: (lead?.status ?? "NOVO") as LeadStatus,
    ownerId: lead?.ownerId ?? "",
    nextFollowUp: toDateInput(lead?.nextFollowUp),
    lastContact: toDateInput(lead?.lastContact),
    notes: lead?.notes ?? "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!form.ownerId && users.length) {
      setForm((f) => ({ ...f, ownerId: session?.user?.id ?? users[0].id }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [users]);

  function update<K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K],
  ) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  // Quais status o papel atual pode selecionar (respeitando transicao a partir do atual).
  function statusOptionDisabled(target: LeadStatus): boolean {
    const perm = canEditLeadStatus(role, target);
    if (!perm.ok) return true;
    const current = lead?.status ?? "NOVO";
    if (target !== current) {
      const t = isValidStatusTransition(current, target);
      if (!t.ok) return true;
    }
    return false;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    // Regra de negocio (client): bloqueia salvar sem follow-up.

    if (!form.ownerId) {
      setError("Selecione um responsavel.");
      return;
    }

    setSaving(true);
    const payload = {
      name: form.name,
      phone: form.phone,
      source: form.source,
      product: form.product,
      estimatedValue: Number(form.estimatedValue || 0),
      status: form.status,
      ownerId: form.ownerId,
      nextFollowUp: form.nextFollowUp,
      lastContact: form.lastContact || null,
      notes: form.notes || null,
    };

    try {
      if (isEdit) {
        await apiFetch(`/api/leads/${lead!.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch("/api/leads", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto scroll-thin"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b flex items-center justify-between sticky top-0 bg-white">
          <h2 className="text-lg font-semibold">
            {isEdit ? "Editar lead" : "Novo lead"}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-xl leading-none"
          >
            ×
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <Field label="Nome do cliente *">
            <input
              required
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Telefone *">
            <input
              required
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
              className={inputCls}
              placeholder="(11) 99999-9999"
            />
          </Field>

          <Field label="Origem *">
            <select
              value={form.source}
              onChange={(e) => update("source", e.target.value as LeadSource)}
              className={inputCls}
            >
              {SOURCES.map((s) => (
                <option key={s} value={s}>
                  {SOURCE_LABEL[s]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Produto *">
            <input
              required
              value={form.product}
              onChange={(e) => update("product", e.target.value)}
              className={inputCls}
            />
          </Field>

          <Field label="Valor estimado (R$)">
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.estimatedValue}
              onChange={(e) => update("estimatedValue", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Responsavel *">
            <select
              value={form.ownerId}
              onChange={(e) => update("ownerId", e.target.value)}
              className={inputCls}
            >
              <option value="">Selecione...</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role})
                </option>
              ))}
            </select>
          </Field>

          <Field label="Status">
            <select
              value={form.status}
              onChange={(e) => update("status", e.target.value as LeadStatus)}
              className={inputCls}
            >
              {STATUS_ORDER.map((s) => (
                <option key={s} value={s} disabled={statusOptionDisabled(s)}>
                  {STATUS_LABEL[s]}
                  {statusOptionDisabled(s) ? " (bloqueado)" : ""}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Proximo follow-up (padrao: D+3 se deixado em branco)">
            <input
              type="date"
              value={form.nextFollowUp}
              onChange={(e) => update("nextFollowUp", e.target.value)}
              className={inputCls}
            />
          </Field>

          <Field label="Ultimo contato">
            <input
              type="date"
              value={form.lastContact}
              onChange={(e) => update("lastContact", e.target.value)}
              className={inputCls}
            />
          </Field>
          <div className="md:col-span-2">
            <Field label="Observacoes">
              <textarea
                value={form.notes}
                onChange={(e) => update("notes", e.target.value)}
                rows={3}
                className={inputCls}
              />
            </Field>
          </div>

          {error && (
            <p className="md:col-span-2 text-sm text-red-600">{error}</p>
          )}

          <div className="md:col-span-2 flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {saving ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-slate-700 mb-1">
        {label}
      </span>
      {children}
    </label>
  );
}

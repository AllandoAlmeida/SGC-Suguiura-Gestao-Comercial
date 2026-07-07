"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/client";
import { Lead } from "@/lib/types";
import { formatCurrency } from "@/lib/format";

type Step = "choice" | "schedule" | "lost";

export default function FollowUpActionModal({
  lead,
  onClose,
  onDone,
}: {
  lead: Lead;
  onClose: () => void;
  onDone: () => void;
}) {
  const [step, setStep] = useState<Step>("choice");
  const [date, setDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSchedule(e: React.FormEvent) {
    e.preventDefault();
    if (!date) return;
    setSaving(true);
    setError("");
    try {
      await apiFetch(`/api/leads/${lead.id}/followup`, {
        method: "POST",
        body: JSON.stringify({ nextFollowUp: date }),
      });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao agendar follow-up.");
    } finally {
      setSaving(false);
    }
  }

  async function handleLost() {
    setSaving(true);
    setError("");
    try {
      await apiFetch(`/api/leads/${lead.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "PERDIDO" }),
      });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao marcar como perdido.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-slate-800">{lead.name}</h2>
          <p className="text-sm text-slate-500">
            {lead.phone} · {lead.product} · {formatCurrency(lead.estimatedValue)}
          </p>
        </div>

        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

        {step === "choice" && (
          <div>
            <p className="text-sm text-slate-600 mb-4">Contato registrado. Qual a próxima ação?</p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setStep("schedule")}
                className="px-4 py-2 rounded-lg bg-brand-600 text-white hover:bg-brand-700 text-sm font-medium"
              >
                📅 Agendar follow-up
              </button>
              <button
                onClick={() => setStep("lost")}
                className="px-4 py-2 rounded-lg border border-red-300 text-red-600 hover:bg-red-50 text-sm font-medium"
              >
                ✕ Perdido
              </button>
            </div>
            <button
              onClick={onClose}
              className="mt-4 text-sm text-slate-500 hover:text-slate-700 underline w-full text-center"
            >
              Cancelar
            </button>
          </div>
        )}

        {step === "schedule" && (
          <form onSubmit={handleSchedule}>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Nova data de follow-up
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              autoFocus
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm mb-4"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStep("choice")}
                className="flex-1 px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-sm"
              >
                Voltar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 px-4 py-2 rounded-lg bg-brand-600 text-white hover:bg-brand-700 text-sm disabled:opacity-60"
              >
                {saving ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </form>
        )}

        {step === "lost" && (
          <div>
            <p className="text-sm text-slate-600 mb-4">
              Confirma marcar este lead como <strong className="text-red-600">Perdido</strong>?
              Essa ação encerra o acompanhamento de follow-up dele.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setStep("choice")}
                className="flex-1 px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-sm"
              >
                Voltar
              </button>
              <button
                onClick={handleLost}
                disabled={saving}
                className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 text-sm disabled:opacity-60"
              >
                {saving ? "Salvando..." : "Confirmar Perdido"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

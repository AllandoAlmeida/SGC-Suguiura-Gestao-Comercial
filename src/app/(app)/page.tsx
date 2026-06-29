"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import DashboardCharts from "@/components/DashboardCharts";
import { apiFetch } from "@/lib/client";
import { DashboardData } from "@/lib/types";
import { formatCurrency } from "@/lib/format";

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch<DashboardData>("/api/dashboard").then(setData).catch((e) => setError(e.message));
  }, []);

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Dashboard Comercial" subtitle="Visao geral do funil de vendas e da equipe" />

      {error && <p className="text-red-600">{error}</p>}
      {!data ? (
        <p className="text-slate-500">Carregando...</p>
      ) : (
        <div className="space-y-6">
          {(data.overdueCount > 0 || data.inactiveCount > 0) && (
            <div className="flex flex-wrap gap-3">
              {data.overdueCount > 0 && (
                <Link href="/followups" className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-2 text-sm hover:bg-red-100">
                  ⚠️ {data.overdueCount} follow-up(s) atrasado(s) — clique para ver
                </Link>
              )}
              {data.inactiveCount > 0 && (
                <span className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 px-4 py-2 text-sm">
                  💤 {data.inactiveCount} lead(s) inativo(s) (sem contato ha +{data.thresholdDays} dias)
                </span>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard label="Total de leads" value={data.totalLeads} />
            <StatCard label="Em negociacao" value={data.inNegotiation} accent="blue" />
            <StatCard label="Vendas fechadas" value={data.closedCount} accent="green" hint={formatCurrency(data.closedValue)} />
            <StatCard label="Taxa de conversao" value={`${data.conversionRate.toFixed(1)}%`} accent="brand" hint="fechados / decididos" />
            <StatCard label="Pipeline financeiro" value={formatCurrency(data.pipelineValue)} accent="amber" hint="oportunidades abertas" />
          </div>

          <DashboardCharts data={data} />

          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <h3 className="font-semibold text-slate-800 mb-4">Ranking de atendentes</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b">
                  <th className="py-2">Atendente</th>
                  <th className="py-2">Papel</th>
                  <th className="py-2 text-right">Leads</th>
                  <th className="py-2 text-right">Fechados</th>
                  <th className="py-2 text-right">Valor fechado</th>
                </tr>
              </thead>
              <tbody>
                {data.perUser.map((u) => (
                  <tr key={u.id} className="border-b last:border-0">
                    <td className="py-2 font-medium text-slate-800">{u.name}</td>
                    <td className="py-2 text-slate-500">{u.role}</td>
                    <td className="py-2 text-right">{u.total}</td>
                    <td className="py-2 text-right text-green-600 font-medium">{u.closed}</td>
                    <td className="py-2 text-right">{formatCurrency(u.closedValue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

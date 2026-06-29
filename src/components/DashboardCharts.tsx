"use client";

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from "recharts";
import { DashboardData } from "@/lib/types";
import { STATUS_LABEL } from "@/lib/domain";

const STATUS_HEX: Record<string, string> = {
  NOVO: "#9ca3af",
  QUALIFICADO: "#8b5cf6",
  ORCAMENTO: "#f59e0b",
  NEGOCIACAO: "#3b82f6",
  FECHADO: "#22c55e",
  PERDIDO: "#ef4444",
};

export default function DashboardCharts({ data }: { data: DashboardData }) {
  const distData = data.distribution.map((d) => ({
    name: STATUS_LABEL[d.status],
    status: d.status,
    leads: d.count,
  }));

  const perfData = data.perUser
    .filter((u) => u.role !== "ADMIN")
    .map((u) => ({ name: u.name, fechados: u.closed, total: u.total }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <h3 className="font-semibold text-slate-800 mb-4">Distribuicao por status</h3>
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie data={distData} dataKey="leads" nameKey="name" cx="50%" cy="50%" outerRadius={95} label>
              {distData.map((entry) => (
                <Cell key={entry.status} fill={STATUS_HEX[entry.status]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <h3 className="font-semibold text-slate-800 mb-4">Desempenho por atendente</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={perfData}>
            <XAxis dataKey="name" fontSize={12} />
            <YAxis allowDecimals={false} fontSize={12} />
            <Tooltip />
            <Legend />
            <Bar dataKey="total" name="Total de leads" fill="#94a3b8" radius={[4, 4, 0, 0]} />
            <Bar dataKey="fechados" name="Vendas fechadas" fill="#22c55e" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

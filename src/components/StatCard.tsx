export default function StatCard({
  label,
  value,
  hint,
  accent = "brand",
}: {
  label: string;
  value: string | number;
  hint?: string;
  accent?: "brand" | "green" | "blue" | "amber" | "red";
}) {
  const accents: Record<string, string> = {
    brand: "text-brand-600",
    green: "text-green-600",
    blue: "text-blue-600",
    amber: "text-amber-600",
    red: "text-red-600",
  };
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${accents[accent]}`}>{value}</p>
      {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
    </div>
  );
}

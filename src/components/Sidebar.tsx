"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { ROLE_LABEL } from "@/lib/domain";

const NAV = [
  { href: "/", label: "Dashboard", icon: "📊" },
  { href: "/pipeline", label: "Pipeline (Kanban)", icon: "🗂️" },
  { href: "/leads", label: "Leads", icon: "👥" },
  { href: "/followups", label: "Follow-ups", icon: "⏰" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = session?.user?.role;

  return (
    <aside className="w-64 shrink-0 bg-slate-900 text-slate-200 flex flex-col min-h-screen">
      <div className="p-5 border-b border-slate-800">
        <h1 className="text-xl font-bold text-white">SGC</h1>
        <p className="text-xs text-slate-400">Suguiura Gestao Comercial</p>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {NAV.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                active ? "bg-brand-600 text-white" : "hover:bg-slate-800"
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-slate-800">
        <div className="px-3 py-2 mb-2">
          <p className="text-sm font-medium text-white truncate">{session?.user?.name}</p>
          <p className="text-xs text-slate-400">{role ? ROLE_LABEL[role] : ""}</p>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full text-left text-sm text-slate-300 hover:bg-slate-800 rounded-lg px-3 py-2 transition"
        >
          🚪 Sair
        </button>
      </div>
    </aside>
  );
}

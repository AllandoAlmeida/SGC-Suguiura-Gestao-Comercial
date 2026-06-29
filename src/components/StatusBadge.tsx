import { LeadStatus } from "@/lib/types";
import { STATUS_COLOR, STATUS_LABEL } from "@/lib/domain";

export default function StatusBadge({ status }: { status: LeadStatus }) {
  const c = STATUS_COLOR[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${c.bg} ${c.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
      {STATUS_LABEL[status]}
    </span>
  );
}

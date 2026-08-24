import { JOB_STATUS_LABELS } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  INTAKE: "text-paper/70",
  DIAGNOSING: "text-amber",
  AWAITING_PARTS: "text-rust",
  IN_PROGRESS: "text-teal",
  READY_FOR_PICKUP: "text-amber",
  COMPLETED: "text-teal",
  CANCELLED: "text-paper/40",
  DRAFT: "text-paper/50",
  SENT: "text-amber",
  PARTIAL: "text-rust",
  PAID: "text-teal",
  VOID: "text-paper/30",
};

export function StatusStamp({ status }: { status: string }) {
  return (
    <span className={`stamp ${STATUS_COLORS[status] || "text-paper"}`}>
      {JOB_STATUS_LABELS[status] || status.replaceAll("_", " ")}
    </span>
  );
}

export function PlateBadge({ plate }: { plate: string }) {
  return <span className="plate-badge">{plate}</span>;
}

export function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="ticket rounded-lg pl-6 pr-5 py-4">
      <p className="text-xs font-mono uppercase tracking-wide text-paper/50">{label}</p>
      <p className="font-display text-3xl font-bold mt-1">{value}</p>
      {sub && <p className="text-xs text-paper/40 mt-1">{sub}</p>}
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="font-display text-2xl font-bold">{title}</h1>
        {subtitle && <p className="text-paper/50 text-sm mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

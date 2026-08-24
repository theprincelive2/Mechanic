"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  LayoutDashboard,
  Users,
  Car,
  ClipboardList,
  Receipt,
  Wallet,
  Boxes,
  Wrench,
  LogOut,
} from "lucide-react";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/customers", label: "Customers", icon: Users },
  { href: "/dashboard/jobs", label: "Jobs", icon: ClipboardList },
  { href: "/dashboard/invoices", label: "Invoices", icon: Receipt },
  { href: "/dashboard/payments", label: "Payments", icon: Wallet },
  { href: "/dashboard/inventory", label: "Inventory", icon: Boxes },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <aside className="w-60 shrink-0 border-r border-graphite-line bg-graphite-panel min-h-screen flex flex-col no-print">
      <div className="flex items-center gap-2 px-5 py-5 border-b border-graphite-line">
        <div className="bg-amber text-graphite p-1.5 rounded-md">
          <Wrench size={18} />
        </div>
        <div>
          <p className="font-display font-bold text-sm leading-none">East Legon Auto</p>
          <p className="text-[10px] text-paper/40 font-mono tracking-wider">SHOP MANAGER</p>
        </div>
      </div>

      <nav className="flex-1 py-4 px-3 space-y-1">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname?.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition ${
                active ? "bg-amber text-graphite" : "text-paper/70 hover:bg-graphite hover:text-paper"
              }`}
            >
              <Icon size={17} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-graphite-line">
        <p className="px-3 text-xs text-paper/50 truncate">{session?.user?.name}</p>
        <p className="px-3 text-[10px] font-mono text-amber/80 uppercase tracking-wide mb-2">
          {(session?.user as any)?.role}
        </p>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-paper/60 hover:bg-graphite hover:text-rust transition"
        >
          <LogOut size={16} /> Sign out
        </button>
      </div>
    </aside>
  );
}

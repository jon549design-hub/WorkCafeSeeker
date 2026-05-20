"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Home", icon: "⌂" },
  { href: "/map", label: "Map", icon: "🗺" },
  { href: "/saved", label: "Saved", icon: "★" },
  { href: "/me", label: "Me", icon: "☰" },
] as const;

export default function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 inset-x-0 h-16 border-t border-border bg-background/90 backdrop-blur z-40">
      <ul className="grid grid-cols-4 h-full">
        {TABS.map((tab) => {
          const active =
            tab.href === "/"
              ? pathname === "/"
              : pathname.startsWith(tab.href);
          return (
            <li key={tab.href} className="flex">
              <Link
                href={tab.href}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-xs ${
                  active ? "text-foreground font-semibold" : "text-subtle"
                }`}
              >
                <span className="text-lg leading-none" aria-hidden>
                  {tab.icon}
                </span>
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

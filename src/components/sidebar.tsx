"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookText,
  CreditCard,
  Calendar,
  Receipt,
  FileText,
  StickyNote,
  HelpCircle,
  Puzzle,
  Building2,
} from "lucide-react";
import { motion } from "framer-motion";

const menuItems = [
  {
    name: "Overview",
    href: "/mgdashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Resource Library",
    href: "/mgdashboard/resources",
    icon: BookText,
  },
  {
    name: "Subscription",
    href: "/mgdashboard/subscribe",
    icon: CreditCard,
  },
  {
    name: "My Appointments",
    href: "/mgdashboard/appointments",
    icon: Calendar,
  },
  {
    name: "Billing & Invoices",
    href: "/mgdashboard/billing",
    icon: Receipt,
  },
  {
    name: "Contracts & Agreements",
    href: "/mgdashboard/contracts",
    icon: FileText,
  },
  {
    name: "Session Recaps",
    href: "/mgdashboard/sessions",
    icon: StickyNote,
  },
  {
    name: "Ask a Question",
    href: "/mgdashboard/questions",
    icon: HelpCircle,
  },
  {
    name: "Service Add-ons",
    href: "/mgdashboard/addon",
    icon: Puzzle,
  },
  {
    name: "Company Profile",
    href: "/mgdashboard/company",
    icon: Building2,
  },
];

export default function Sidebar({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-30 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed z-50 top-0 left-0 h-full w-64 bg-white border-r p-4 transform transition-transform duration-300 
        ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0 md:static md:block`}
        role="navigation"
        aria-label="Primary"
      >
        <div className="flex items-center space-x-2 mb-6">
          <div className="bg-blue-800 text-white font-bold p-2 rounded">MG</div>
          <span className="font-semibold text-lg">MG Consulting</span>
        </div>

        <nav className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isOverview = item.href === "/mgdashboard";
            const active = isOverview
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.name}
                href={item.href}
                className={
                  `relative flex items-center space-x-2 p-2 rounded text-gray-700 transition-colors ` +
                  (active ? "text-blue-700" : "hover:bg-blue-100")
                }
                onClick={onClose}
                aria-current={active ? "page" : undefined}
              >
                {active && (
                  <motion.span
                    layoutId="sidebar-active"
                    className="absolute inset-0 rounded bg-blue-100"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <Icon size={18} className={`relative z-10 ${active ? "text-blue-700" : "text-gray-600"}`} />
                <span className={`relative z-10 ${active ? "font-medium" : ""}`}>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}

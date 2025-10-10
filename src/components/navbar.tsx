"use client";

import React from "react";
import { Menu, Bell, LogOut, Search } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";

interface NavbarProps {
  onMenuClick?: () => void;
}

export default function Navbar({ onMenuClick }: NavbarProps) {
  const { user, signOut } = useAuth();
  const router = useRouter();

  return (
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center gap-2">
        <button
          className="md:hidden inline-flex items-center justify-center rounded-md border p-2 hover:bg-gray-50"
          aria-label="Open sidebar"
          onClick={onMenuClick}
        >
          <Menu size={20} />
        </button>
        <div className="hidden md:flex items-center gap-2 text-sm text-gray-600">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search..."
            className="outline-none border-none focus:ring-0"
            aria-label="Search"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          className="inline-flex items-center justify-center rounded-md border p-2 hover:bg-gray-50"
          aria-label="Notifications"
        >
          <Bell size={18} />
        </button>
        <div className="text-sm text-gray-700">
          {user?.user_metadata?.full_name || user?.email || "User"}
        </div>
        <button
          className="inline-flex items-center justify-center rounded-md border p-2 hover:bg-gray-50"
          aria-label="Logout"
          onClick={async () => {
            try {
              await signOut();
              router.push("/login");
            } catch (e) {
              console.error("Logout failed", e);
            }
          }}
        >
          <LogOut size={18} />
        </button>
      </div>
    </div>
  );
}

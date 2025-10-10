import type React from "react";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export default async function MgDashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = createServerSupabaseClient();

  // Get authenticated user from cookies/session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    try {
      // Check if profile exists
      const { data: existing, error: selectError } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();

      // If not exists, create a minimal profile
      if (!existing && !selectError) {
        const { error: insertError } = await supabase.from("profiles").insert([
          {
            id: user.id,
            email: user.email,
            full_name: (user.user_metadata as any)?.full_name ?? null,
            company_name: (user.user_metadata as any)?.company_name ?? null,
            phone: (user.user_metadata as any)?.phone ?? null,
            address: (user.user_metadata as any)?.address ?? null,
            role: "client",
          },
        ]);
        // Silently ignore insert errors to avoid blocking navigation
        if (insertError) {
          console.error("[ensureProfileExists] insert error:", insertError.message);
        }
      }
    } catch (err) {
      console.error("[ensureProfileExists] unexpected error:", (err as any)?.message ?? err);
    }
  }

  return <>{children}</>;
}
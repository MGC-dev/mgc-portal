"use client";
import Sidebar from "@/components/sidebar";
import Navbar from "@/components/navbar";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { createClient } from "@/lib/supabase";

interface ProfileData {
  full_name: string;
  company_name: string;
  phone: string;
  email: string;
}

export default function CompanyProfilePage() {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileData>({
    full_name: "",
    company_name: "",
    phone: "",
    email: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    async function loadProfile() {
      console.log("[v0] Starting to load profile, user:", user);
      if (!user) {
        console.log("[v0] No user found, skipping profile load");
        return;
      }

      try {
        console.log("[v0] Fetching profile for user ID:", user.id);
        const { data, error } = await supabase
          .from("profiles")
          .select("full_name, company_name, phone, email")
          .eq("id", user.id)
          .single();

        console.log("[v0] Profile query result:", { data, error });

        if (error) {
          console.error("[v0] Error loading profile:", error);
          return;
        }

        if (data) {
          console.log("[v0] Successfully loaded profile:", data);
          setProfile(data);
        }
      } catch (error) {
        console.error("[v0] Exception loading profile:", error);
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [user, supabase]);

  const handleSave = async () => {
    console.log("[v0] Starting to save profile...");
    if (!user) {
      console.log("[v0] No user found, cannot save");
      return;
    }

    setSaving(true);
    try {
      console.log(
        "[v0] Updating profile for user:",
        user.id,
        "with data:",
        profile
      );
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: profile.full_name,
          company_name: profile.company_name,
          phone: profile.phone,
        })
        .eq("id", user.id);

      console.log("[v0] Profile update result:", { error });

      if (error) {
        console.error("[v0] Error saving profile:", error);
        alert("Error saving profile. Please try again.");
      } else {
        console.log("[v0] Profile saved successfully!");
        alert("Profile saved successfully!");
      }
    } catch (error) {
      console.error("[v0] Exception saving profile:", error);
      alert("Error saving profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50 items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar - hidden on mobile */}
      <div className="hidden md:block" onClick={() => setSidebarOpen(false)}>
        <Sidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />
      </div>
      {/* Sidebar (mobile overlay) */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Dark overlay */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50"
            onClick={() => setSidebarOpen(false)}
          />
          {/* Sidebar drawer */}
          <div className="relative z-50 w-64 bg-white shadow-lg">
            <Sidebar
              isOpen={isSidebarOpen}
              onClose={() => setSidebarOpen(false)}
            />
          </div>
        </div>
      )}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top navbar */}
        <header className="flex items-center justify-between gap-4 px-6 py-3 border-b bg-white">
          <Navbar onMenuClick={() => setSidebarOpen(true)} />
        </header>
        {/* Main Content */}
        <main className="flex-1 p-8">
          {/* Page Title & Save Button */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold">Company Profile</h1>
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-blue-800 text-white px-6 py-2 rounded-lg shadow hover:bg-blue-900 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>

          {/* Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Company Information Card */}
            <div className="bg-white rounded-2xl shadow p-6">
              <h2 className="flex items-center space-x-2 font-semibold text-lg mb-4">
                <span>🏢</span>
                <span>Company Information</span>
              </h2>

              <div className="space-y-4">
                {/* Full Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={profile.full_name}
                    onChange={(e) =>
                      setProfile({ ...profile, full_name: e.target.value })
                    }
                    className="w-full mt-1 border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your full name"
                  />
                </div>

                {/* Company Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Company Name
                  </label>
                  <input
                    type="text"
                    value={profile.company_name}
                    onChange={(e) =>
                      setProfile({ ...profile, company_name: e.target.value })
                    }
                    className="w-full mt-1 border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your company name"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <input
                    type="email"
                    value={profile.email}
                    readOnly
                    className="w-full mt-1 border rounded-lg px-3 py-2 bg-gray-50 text-gray-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Email cannot be changed here
                  </p>
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={profile.phone}
                    onChange={(e) =>
                      setProfile({ ...profile, phone: e.target.value })
                    }
                    className="w-full mt-1 border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your phone number"
                  />
                </div>
              </div>
            </div>

            {/* Account Information Card */}
            <div className="bg-white rounded-2xl shadow p-6">
              <h2 className="flex items-center space-x-2 font-semibold text-lg mb-4">
                <span>👤</span>
                <span>Account Information</span>
              </h2>

              <div className="space-y-4">
                {/* Account Status */}
                <div className="flex items-center justify-between border rounded-lg p-3">
                  <div>
                    <p className="font-medium">Account Status</p>
                    <p className="text-sm text-gray-500">Active</p>
                  </div>
                  <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                    Active
                  </span>
                </div>

                {/* Member Since */}
                <div className="flex items-center justify-between border rounded-lg p-3">
                  <div>
                    <p className="font-medium">Member Since</p>
                    <p className="text-sm text-gray-500">
                      {user?.created_at
                        ? new Date(user.created_at).toLocaleDateString()
                        : "N/A"}
                    </p>
                  </div>
                </div>

                {/* Role */}
                <div className="flex items-center justify-between border rounded-lg p-3">
                  <div>
                    <p className="font-medium">Role</p>
                    <p className="text-sm text-gray-500">Client</p>
                  </div>
                  <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                    Client
                  </span>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

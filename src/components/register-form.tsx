"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import Link from "next/link";
import { Hash, Eye, EyeOff } from "react-feather";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export function RegisterForm() {
  const [registerData, setRegisterData] = useState({
    fullName: "",
    CompanyName: "",
    email: "",
    phone: "",
    address: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showPasswordRules, setShowPasswordRules] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [supabaseClient, setSupabaseClient] = useState<any>(null);
  const [clientError, setClientError] = useState<string>("");
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  // removed lastActionLink state (no magic link)
  const [verificationCode, setVerificationCode] = useState("");
  const RESEND_COOLDOWN_SECONDS = 60;
  const [success, setSuccess] = useState("");
  const router = useRouter();

  useEffect(() => {
    try {
      const client = createClient();
      setSupabaseClient(client);
    } catch (err) {
      setClientError(
        err instanceof Error
          ? err.message
          : "Failed to initialize Supabase client"
      );
    }
  }, []);

  const generatePassword = () => {
    const charset =
      "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*";
    const generated = Array.from(
      { length: 12 },
      () => charset[Math.floor(Math.random() * charset.length)]
    ).join("");
    setRegisterData({
      ...registerData,
      password: generated,
      confirmPassword: generated,
    });
  };

  const validatePassword = (password: string): boolean => {
    const length = password.length >= 8;
    const upper = /[A-Z]/.test(password);
    const lower = /[a-z]/.test(password);
    const number = /[0-9]/.test(password);
    const special = /[!@#$%^&*]/.test(password);
    return length && upper && lower && number && special;
  };

  const getPasswordStrength = (
    password: string
  ): "Weak" | "Medium" | "Strong" => {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[!@#$%^&*]/.test(password)) score++;

    if (score <= 2) return "Weak";
    else if (score === 3 || score === 4) return "Medium";
    else return "Strong";
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    let cleanedValue = value;
    if (name === "phone") {
      cleanedValue = value.replace(/\D/g, "");
    }

    setRegisterData((prev) => ({
      ...prev,
      [name]: cleanedValue,
    }));
    setError("");
  };

  const handlePhoneKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const allowedKeys = [
      "Backspace",
      "Delete",
      "ArrowLeft",
      "ArrowRight",
      "Tab",
    ];
    if (allowedKeys.includes(e.key)) return;
    if (!/^[0-9]$/.test(e.key)) {
      e.preventDefault();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // We keep validations as-is above
    if (!validatePassword(registerData.password)) {
      setError(
        "Password must be at least 8 characters long and include uppercase, lowercase, number, and special character."
      );
      setLoading(false);
      return;
    }

    if (registerData.password !== registerData.confirmPassword) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    if (!agreeToTerms) {
      setError("Please agree to the terms and conditions");
      setLoading(false);
      return;
    }

    try {
      const payload = {
        email: registerData.email.trim().toLowerCase(),
        password: registerData.password,
        metadata: {
          full_name: registerData.fullName?.trim() || null,
          company_name: registerData.CompanyName?.trim() || null,
          phone: registerData.phone || null,
          address: registerData.address || null,
          role: "client",
        },
        emailTemplateParams: {
          full_name: registerData.fullName?.trim() || undefined,
        },
      };

      const res = await fetch("/api/auth/generate-signup-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Failed to initiate registration");
        setLoading(false);
        return;
      }

      setAwaitingConfirmation(true);
      setResendCountdown(RESEND_COOLDOWN_SECONDS);
      // action_link removed; no magic link stored
    } catch (err) {
      console.error("[v0] Registration error:", err);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (clientError) {
    return (
      <div className="text-center p-4">
        <p className="text-red-200 mb-4">{clientError}</p>
        <p className="text-white/80 text-sm">
          Please add your Supabase integration in the project settings to
          continue.
        </p>
      </div>
    );
  }

  useEffect(() => {
    if (resendCountdown <= 0) return;
    const timer = setInterval(
      () => setResendCountdown((s) => Math.max(0, s - 1)),
      1000
    );
    return () => clearInterval(timer);
  }, [resendCountdown]);

  const handleResendEmail = async () => {
    if (resendCountdown > 0) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/generate-signup-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: registerData.email.trim().toLowerCase(),
          password: registerData.password,
          metadata: {
            full_name: registerData.fullName?.trim() || null,
            company_name: registerData.CompanyName?.trim() || null,
            phone: registerData.phone || null,
            address: registerData.address || null,
            role: "client",
          },
          emailTemplateParams: {
            full_name: registerData.fullName?.trim() || undefined,
          },
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Failed to resend verification email");
      } else {
          // action_link removed; no magic link stored
          setResendCountdown(RESEND_COOLDOWN_SECONDS);
        }
    } catch (err) {
      setError("Failed to resend verification email");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-500/20 border border-red-500/30 text-red-200 px-4 py-2 rounded-md text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-500/20 border border-green-500/30 text-green-200 px-4 py-2 rounded-md text-sm">
          {success}
        </div>
      )}

      {awaitingConfirmation && (
        <div className="bg-blue-500/20 border border-blue-500/30 text-blue-100 px-4 py-3 rounded-md text-sm">
          <p className="mb-2">We emailed you a verification code to {registerData.email}. Enter the 6-digit code below to verify your account.</p>
          <div className="flex items-center gap-3 mb-3">
            <Input
              id="verificationCode"
              name="verificationCode"
              type="text"
              placeholder="Enter 6-digit code"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              className="bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:border-white/40 focus:ring-white/20"
            />
            <Button
              type="button"
              disabled={loading || !verificationCode}
              onClick={async () => {
                 setLoading(true);
                 setError("");
                 try {
                   const res = await fetch("/api/auth/verify-otp", {
                     method: "POST",
                     headers: { "Content-Type": "application/json" },
                     body: JSON.stringify({ email: registerData.email.trim().toLowerCase(), code: verificationCode.trim() }),
                   });
                   const json = await res.json();
                   if (!res.ok) {
                     setError(json.error || "Verification failed");
                   } else {
                     setSuccess("Email verified successfully. Redirecting to login...");
                     setAwaitingConfirmation(false);
                     setTimeout(() => {
                       router.push("/login");
                     }, 1500);
                   }
                 } catch (e: any) {
                   setError(e?.message || "Verification failed");
                 } finally {
                   setLoading(false);
                 }
              }}
            >
              Verify
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <Button type="button" onClick={handleResendEmail} disabled={loading || resendCountdown > 0}>
              {resendCountdown > 0 ? `Resend (${resendCountdown}s)` : "Resend code"}
            </Button>
            <Link href="/login" className="text-white/80 underline">Already verified? Log in</Link>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="fullName" className="text-white">
          Full Name
        </Label>
        <Input
          id="fullName"
          name="fullName"
          type="text"
          placeholder="John Doe"
          value={registerData.fullName}
          onChange={handleInputChange}
          required
          className="bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:border-white/40 focus:ring-white/20"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="CompanyName" className="text-white">
          Company Name
        </Label>
        <Input
          id="CompanyName"
          name="CompanyName"
          type="text"
          placeholder="Your Company LLC"
          value={registerData.CompanyName}
          onChange={handleInputChange}
          required
          className="bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:border-white/40 focus:ring-white/20"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email" className="text-white">
          Email Address
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="john@company.com"
          value={registerData.email}
          onChange={handleInputChange}
          required
          disabled={awaitingConfirmation}
          className="bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:border-white/40 focus:ring-white/20"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone" className="text-white">
          Phone Number
        </Label>
        <Input
          id="phone"
          name="phone"
          type="text"
          placeholder="Mobile Number"
          value={registerData.phone}
          onChange={handleInputChange}
          onKeyDown={handlePhoneKeyDown}
          maxLength={10}
          inputMode="numeric"
          required
          className="bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:border-white/40 focus:ring-white/20"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password" className="text-white">
          Password
        </Label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder="Create a strong password"
            value={registerData.password}
            onChange={handleInputChange}
            onFocus={() => setShowPasswordRules(true)}
            onBlur={() => setShowPasswordRules(false)}
            required
            className="bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:border-white/40 focus:ring-white/20 pr-20"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex space-x-1">
            <button
              type="button"
              onClick={generatePassword}
              title="Generate Password"
              className="p-1 text-white/60 hover:text-white"
            >
              <Hash size={16} />
            </button>
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              title="Show/Hide Password"
              className="p-1 text-white/60 hover:text-white"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {registerData.password && (
          <p
            className={`text-sm ${
              getPasswordStrength(registerData.password) === "Strong"
                ? "text-green-300"
                : getPasswordStrength(registerData.password) === "Medium"
                ? "text-yellow-300"
                : "text-red-300"
            }`}
          >
            Strength: {getPasswordStrength(registerData.password)}
          </p>
        )}

        {showPasswordRules && (
          <div className="bg-white/10 border border-white/20 rounded-md p-3 text-sm text-white/90">
            <strong>Password must contain:</strong>
            <ul className="mt-1 space-y-1 text-xs">
              <li>• At least 8 characters</li>
              <li>• One uppercase letter</li>
              <li>• One lowercase letter</li>
              <li>• One number</li>
              <li>• One special character (!@#$%^&*)</li>
            </ul>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword" className="text-white">
          Confirm Password
        </Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          placeholder="Confirm your password"
          value={registerData.confirmPassword}
          onChange={handleInputChange}
          required
          className="bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:border-white/40 focus:ring-white/20"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="address" className="text-white">
          Address
        </Label>
        <Textarea
          id="address"
          name="address"
          placeholder="Enter your full address"
          value={registerData.address}
          onChange={handleInputChange}
          rows={3}
          required
          className="bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:border-white/40 focus:ring-white/20 resize-none"
        />
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="terms"
          checked={agreeToTerms}
          onCheckedChange={(checked) => setAgreeToTerms(checked as boolean)}
          className="border-white/20 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
        />
        <Label htmlFor="terms" className="text-sm text-white">
          I agree to the{" "}
          <Link
            href="/terms"
            className="text-blue-200 hover:text-white underline"
          >
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link
            href="/privacy"
            className="text-blue-200 hover:text-white underline"
          >
            Privacy Policy
          </Link>
        </Label>
      </div>

      <Button
        type="submit"
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium"
        disabled={loading}
      >
        {loading ? "Creating Account..." : "Create Account"}
      </Button>
    </form>
  );
}

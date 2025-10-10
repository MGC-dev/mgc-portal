"use client";

import type React from "react";
import { useState } from "react";
import { RegisterForm } from "@/components/register-form";
import { LoginForm } from "@/components/login-form";

export default function AuthForm() {
  const [mode, setMode] = useState<"register" | "login">("register");

  return (
    <div className="max-w-md mx-auto p-6">
      {mode === "register" ? (
        <>
          <RegisterForm />
          <div className="mt-4 text-center text-white/80">
            Already have an account?{" "}
            <button
              type="button"
              onClick={() => setMode("login")}
              className="underline hover:text-white"
            >
              Sign in
            </button>
          </div>
        </>
      ) : (
        <>
          <LoginForm />
          <div className="mt-4 text-center text-white/80">
            Need an account?{" "}
            <button
              type="button"
              onClick={() => setMode("register")}
              className="underline hover:text-white"
            >
              Create one
            </button>
          </div>
        </>
      )}
    </div>
  );
}

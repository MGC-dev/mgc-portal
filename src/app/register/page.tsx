import { RegisterForm } from "@/components/register-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";

export default function RegisterPage() {
  return (
    <div className="min-h-screen relative flex items-center justify-center p-4">
      {/* Background Images */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url('/modern-office-building.png')`,
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/60 via-slate-900/50 to-blue-800/60" />

      {/* Content */}
      <div className="relative z-10 w-full max-w-md md:max-w-2xl lg:max-w-3xl space-y-6">
        {/* Logo/Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-white/20 backdrop-blur-md border border-white/30 rounded-lg flex items-center justify-center shadow-xl">
            <span className="text-2xl font-bold text-white">MG</span>
          </div>
          <h1 className="text-3xl font-bold text-white drop-shadow-lg">
            MG Consulting Firm
          </h1>
          <p className="text-white/90 drop-shadow-md">
            Create your client portal account
          </p>
        </div>

        {/* Registration Form Card */}
        <Card className="bg-white/15 backdrop-blur-xl border border-white/20 shadow-2xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl text-white">Create Account</CardTitle>
            <CardDescription className="text-white/80">
              Fill in your information to get started
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RegisterForm />
          </CardContent>
        </Card>

        {/* Footer Links */}
        <div className="text-center space-y-2">
          <p className="text-sm text-white/90 drop-shadow-md">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-blue-200 hover:text-white font-medium underline underline-offset-2"
            >
              Sign in here
            </Link>
          </p>
          <div className="flex justify-center space-x-4 text-xs text-white/80 drop-shadow-sm">
            <Link
              href="/privacy"
              className="hover:text-white underline underline-offset-2"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              className="hover:text-white underline underline-offset-2"
            >
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

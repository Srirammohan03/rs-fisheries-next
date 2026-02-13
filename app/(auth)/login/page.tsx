// app\(auth)\login\page.tsx
"use client";

import { useState } from "react";
import axios from "axios";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await axios.post(
        "/api/login",
        { email, password },
        {
          withCredentials: true, // 🔥 important for cookies
        },
      );

      if (res.data?.message === "Login successful") {
        // 🔥 wait small time so cookie is saved
        setTimeout(() => {
          window.location.href = "/stocks";
        }, 300);
      } else {
        setError("Invalid email or password");
      }
    } catch (err: any) {
      console.error("LOGIN ERROR:", err);
      setError("Login failed. Check server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* ================= LEFT BRAND PANEL (DESKTOP) ================= */}
      <div className="hidden lg:flex relative overflow-hidden bg-gradient-to-br from-blue-800 to-teal-900">
        <div className="absolute inset-0 bg-black/30" />

        <div className="relative z-10 flex items-start justify-center flex-col p-12 text-white max-w-lg">
          <Image
            src="/assets/favicon.jpg"
            alt="RS Fisheries Logo"
            width={140}
            height={140}
            priority
            className="rounded-xl shadow-2xl mb-8"
          />

          <h1 className="text-5xl font-bold mb-4">RS Fisheries</h1>
          <p className="text-xl opacity-90 leading-relaxed">
            Managing sustainable fisheries with precision and care.
          </p>
        </div>

        <div className="absolute bottom-8 left-12 text-sm text-white/70 z-10">
          © {new Date().getFullYear()} RS Fisheries. All rights reserved.
          <br />
          Powered by{" "}
          <Link
            href="https://www.outrightcreators.com/"
            target="_blank"
            className="text-[#139BC3] hover:underline font-medium"
          >
            Outright Creators
          </Link>
        </div>
      </div>

      {/* ================= RIGHT LOGIN PANEL ================= */}
      <div className="flex items-center justify-center bg-gray-50 px-4 py-12">
        <Card className="w-full max-w-md shadow-2xl rounded-2xl border-0">
          {/* Mobile Logo */}
          <div className="lg:hidden pt-10 text-center">
            <Image
              src="/assets/favicon.jpg"
              alt="RS Fisheries Logo"
              width={110}
              height={110}
              priority
              className="mx-auto mb-4"
            />
          </div>

          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
            <CardDescription>
              Sign in to your RS Fisheries account
            </CardDescription>
          </CardHeader>

          <CardContent className="px-8 pb-10">
            <form onSubmit={handleLogin} className="space-y-6">
              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label>Email Address</Label>
                <Input
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  required
                  className="h-12"
                />
              </div>

              <div className="space-y-2">
                <Label>Password</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your secure password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    required
                    className="h-12 pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 text-lg bg-blue-600 hover:bg-blue-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>

            {/* Mobile footer */}
            <p className="mt-10 text-center text-sm text-gray-500 lg:hidden">
              © {new Date().getFullYear()} RS Fisheries. Powered by{" "}
              <Link
                href="https://www.outrightcreators.com/"
                className="text-[#139BC3] hover:underline font-medium"
              >
                Outright Creators
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

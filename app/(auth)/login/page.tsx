"use client";

import { useState } from "react";
import axios from "axios";
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
import { Eye, EyeOff, Loader2 } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await axios.post("/api/login", { email, password });

      if (res.data.message === "Login successful") {
        router.replace("/dashboard");
      }
    } catch (err: any) {
      setError("Invalid email or password. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left side - Brand / Background (Desktop only) */}
      <div className="hidden lg:flex relative overflow-hidden bg-gradient-to-br from-blue-700 to-teal-800">
        {/* Darker overlay - now allows clicks through */}
        <div className="absolute inset-0 bg-black/30 pointer-events-none" />

        <div className="relative z-10 flex flex-col justify-center items-start p-12 text-white max-w-lg">
          <Image
            src="/favicon.jpg"
            alt="RS Fisheries Logo"
            width={140}
            height={140}
            className="rounded-full shadow-2xl mb-8"
            priority
          />
          <h1 className="text-5xl font-bold mb-4">RS Fisheries</h1>
          <p className="text-xl opacity-90">
            Managing sustainable fisheries with precision and care.
          </p>
        </div>

        {/* Footer credit on desktop left */}
        <div className="absolute bottom-8 left-12 text-sm text-white/70 z-20">
          {" "}
          {/* Added z-20 for safety */}© {new Date().getFullYear()} RS
          Fisheries. All rights reserved. Powered by{" "}
          <Link
            href="https://www.outrightcreators.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-[#139BC3] hover:underline"
          >
            Outright Creators
          </Link>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="flex items-center justify-center bg-gray-50 px-4 py-12">
        <Card className="w-full max-w-md shadow-2xl rounded-2xl border-0">
          {/* Mobile Header with Logo & Tagline */}
          <div className="lg:hidden px-8 pt-10 text-center">
            <Image
              src="/favicon.jpg"
              alt="RS Fisheries Logo"
              width={90}
              height={90}
              className="rounded-full shadow-lg mx-auto "
              priority
            />
            {/* <h1 className="text-3xl font-bold text-gray-900">RS Fisheries</h1>
            <p className="mt-2 text-gray-600">
              Managing sustainable fisheries with precision and care.
            </p> */}
          </div>

          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
            <CardDescription className="text-base">
              Sign in to your RS Fisheries account
            </CardDescription>
          </CardHeader>

          <CardContent className="px-8 pb-10">
            <form onSubmit={handleLogin} className="space-y-6">
              {error && (
                <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700 border border-red-200">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  className="h-12"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your secure password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    className="h-12 pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
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
                className="w-full h-12 text-lg font-medium bg-blue-600 hover:bg-blue-700"
                disabled={loading}
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

            {/* Mobile footer credit */}
            <p className="mt-10 text-center text-sm text-gray-500 lg:hidden">
              © {new Date().getFullYear()} RS Fisheries. All rights reserved.{" "}
              Powered by{" "}
              <Link
                href="https://www.outrightcreators.com/"
                className="font-medium text-[#139BC3] hover:underline"
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

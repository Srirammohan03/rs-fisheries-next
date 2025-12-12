"use client";

import { useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, EyeOff, Loader2 } from "lucide-react"; // Added Loader2 for loading state
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault(); // Prevent default form submission
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
    // Updated background for a cleaner, more neutral look
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 animate-fadeIn">
      {/* Logo Container - Made logo text slightly bolder */}
      <div className="mb-10 flex flex-col items-center">
        <Image
          src="/favicon.jpg"
          alt="Logo"
          width={100}
          height={100}
          // Smaller logo, cleaner shadow/ring
          className="rounded-full shadow-xl ring-4 ring-white"
          priority
        />
        <p className="mt-4 text-xl font-extrabold tracking-tight text-gray-800">
          RS Fisheries
        </p>
      </div>

      {/* Login Card - Cleaner shadow and removed backdrop blur for simplicity */}
      <Card className="w-full max-w-sm border border-gray-200 rounded-xl shadow-2xl transition-all duration-300 hover:shadow-3xl">
        <CardHeader className="pt-8 pb-3">
          <CardTitle className="text-3xl font-extrabold text-center text-gray-900">
            Welcome Back
          </CardTitle>
          <p className="text-center text-sm text-gray-500 mt-1">
            Sign in to access your secure dashboard
          </p>
        </CardHeader>

        {/* Changed to a <form> for better submission handling (Enter key support) */}
        <form onSubmit={handleLogin}>
          <CardContent className="mt-4 space-y-6">
            {/* Enhanced Error Message Style */}
            {error && (
              <p className="text-red-700 text-sm text-center bg-red-100/70 p-3 rounded-lg border border-red-300 shadow-sm">
                {error}
              </p>
            )}

            {/* Email Input */}
            <div className="space-y-2">
              <label
                className="text-sm font-medium text-gray-700"
                htmlFor="email"
              >
                Email Address
              </label>
              <Input
                id="email"
                type="email" // Added type="email" for mobile keyboards and validation
                placeholder="you@company.com" // More professional placeholder
                className="h-12 border-gray-300 focus-visible:ring-blue-500 focus-visible:border-blue-500 transition-shadow duration-200"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required // Added required
                disabled={loading}
              />
            </div>

            {/* Password Input */}
            <div className="space-y-2">
              <label
                className="text-sm font-medium text-gray-700"
                htmlFor="password"
              >
                Password
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your secure password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 pr-12 border-gray-300 focus-visible:ring-blue-500 focus-visible:border-blue-500 transition-shadow duration-200"
                  required
                  disabled={loading}
                />

                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button - Used a professional Blue for action */}
            <Button
              type="submit"
              className="w-full h-12 rounded-lg text-md font-semibold bg-blue-600 hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl disabled:opacity-70 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Please wait...
                </div>
              ) : (
                "Sign In"
              )}
            </Button>
          </CardContent>
        </form>
      </Card>

      <p className="mt-8 text-sm text-gray-500">
        &copy; {new Date().getFullYear()} RS Fisheries. All rights reserved.
      </p>
    </div>
  );
}

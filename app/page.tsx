"use client";

import React, { useState, FormEvent } from "react";
import { useAuth } from "@/components/AuthContext";

const EyeIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {" "}
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />{" "}
    <circle cx="12" cy="12" r="3" />{" "}
  </svg>
);
const EyeOffIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {" "}
    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />{" "}
    <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />{" "}
    <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />{" "}
    <line x1="2" x2="22" y1="2" y2="22" />{" "}
  </svg>
);

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Terjadi kesalahan.");
      }

      login(data.user, data.token);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white font-sans text-gray-900">
      <div className="flex min-h-screen">
        <div className="flex flex-1 flex-col justify-between items-center p-6 lg:p-10">
          <div className="w-full text-left">
            <img
              src="/images/logo-klinik.png"
              alt="Logo Klinik"
              className="h-12 w-auto cursor-pointer"
            />
          </div>

          <div className="w-full max-w-sm">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold tracking-tight">Welcome</h2>
              <p className="text-gray-500 mt-2 whitespace-nowrap">
                Enter your email and password to access your account.
              </p>
            </div>

            {error && (
              <div
                className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4"
                role="alert"
              >
                <span className="block sm:inline">{error}</span>
              </div>
            )}

            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700"
                >
                  {" "}
                  Email{" "}
                </label>
                <div className="mt-1">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    placeholder="Input your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-[#01449D] focus:outline-none focus:ring-1 focus:ring-[#01449D] sm:text-sm"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700"
                >
                  {" "}
                  Password{" "}
                </label>
                <div className="mt-1 relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    placeholder="Input your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-[#01449D] focus:outline-none focus:ring-1 focus:ring-[#01449D] sm:text-sm"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 flex items-center pr-3"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOffIcon className="text-gray-400 hover:text-gray-600" />
                    ) : (
                      <EyeIcon className="text-gray-400 hover:text-gray-600" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 focus:ring-[#01449D] accent-[#01449D]"
                  />
                  <label
                    htmlFor="remember-me"
                    className="ml-2 block text-sm text-gray-900"
                  >
                    {" "}
                    Remember Me{" "}
                  </label>
                </div>
                {/* <div className="text-sm">
                  <a
                    href="#"
                    className="font-medium hover:underline"
                    style={{ color: "#01449D" }}
                  >
                    {" "}
                    Forgot Your Password?{" "}
                  </a>
                </div> 
                */}
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex w-full justify-center rounded-md border border-transparent py-3 px-4 text-sm font-medium text-white shadow-sm hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#01449D] disabled:opacity-50"
                  style={{ backgroundColor: "#01449D" }}
                >
                  {isLoading ? "Logging in..." : "Log In"}
                </button>
              </div>
            </form>
            {/* <p className="mt-8 text-center text-sm text-gray-500">
              Don't Have An Account?{" "}
              <a
                href="#"
                className="font-medium hover:underline"
                style={{ color: "#01449D" }}
              >
                {" "}
                Register Now.{" "}
              </a>
            </p> 
            */}
          </div>

          <div className="w-full text-center lg:text-left">
            <p className="text-xs text-gray-400">
              Copyright © 2025 Sim Klinik.
              <a href="#" className="ml-4 hover:underline">
                {" "}
                Privacy Policy{" "}
              </a>
            </p>
          </div>
        </div>

        <div
          className="hidden lg:flex flex-1 items-center justify-center text-white p-10 relative overflow-hidden"
          style={{ backgroundColor: "#01449D" }}
        >
          <svg
            className="absolute inset-0 h-full w-full"
            xmlns="http://www.w3.org/2000/svg"
          >
            {" "}
            <defs>
              {" "}
              <pattern
                id="wavy"
                patternUnits="userSpaceOnUse"
                width="40"
                height="80"
                patternTransform="rotate(45)"
              >
                {" "}
                <path
                  d="M 0 20 Q 10 10, 20 20 T 40 20"
                  stroke="#ffffff"
                  strokeWidth="1"
                  fill="none"
                  strokeOpacity="0.1"
                />{" "}
                <path
                  d="M 0 60 Q 10 50, 20 60 T 40 60"
                  stroke="#ffffff"
                  strokeWidth="1"
                  fill="none"
                  strokeOpacity="0.1"
                />{" "}
              </pattern>{" "}
            </defs>{" "}
            <rect width="100%" height="100%" fill="url(#wavy)" />{" "}
          </svg>
          <div className="relative z-10 flex flex-col items-center text-center max-w-lg">
            <img
              src="/images/3d-doctor-klinik.png"
              alt="3D Illustration of a doctor"
              width={500}
              height={500}
              className="mb-8 object-contain"
            />
            <h2 className="text-4xl font-bold leading-tight">
              Welcome to the new era of clinical management.
            </h2>
            <p className="mt-4" style={{ color: "rgba(255, 255, 255, 0.8)" }}>
              Access your clinical information system for faster and modern
              services.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
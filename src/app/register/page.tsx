"use client";

import { useState } from "react";
import Link from "next/link";

export default function RegisterPage() {
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const emailValid = form.email.toLowerCase().endsWith("@ansartechnologies.my");
  const passwordMatch = form.password === form.confirm;
  const passwordStrong = form.password.length >= 8;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setSuccess("");

    if (!emailValid) {
      setError("Only @ansartechnologies.my email addresses are allowed.");
      return;
    }
    if (!passwordStrong) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (!passwordMatch) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, email: form.email, password: form.password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Registration failed"); return; }
      setSuccess(data.message || "Registration successful! Please check your email.");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6" style={{ colorScheme: "light" }}>
        <div className="w-full max-w-md text-center">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-10">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Check your email</h2>
            <p className="text-gray-500 text-sm mb-2">
              We sent a verification link to
            </p>
            <p className="text-[#0078d4] font-semibold text-sm mb-6">{form.email}</p>
            <p className="text-gray-400 text-xs mb-8">
              Click the link in the email to activate your account. The link expires in 24 hours.
            </p>
            <Link href="/login" className="inline-block w-full py-2.5 bg-[#0078d4] text-white rounded-xl font-semibold text-sm hover:bg-[#106ebe] transition-colors text-center">
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex" style={{ colorScheme: "light" }}>
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#0078d4] flex-col items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-64 h-64 rounded-full bg-white" />
          <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full bg-white" />
        </div>
        <div className="relative z-10 text-center">
          <img src="/assets/img/logo.png" alt="AnSar Calendar" className="h-20 w-auto object-contain mx-auto mb-8 brightness-0 invert" />
          <h2 className="text-3xl font-bold text-white mb-4">Join AnSar Calendar</h2>
          <p className="text-blue-100 text-lg max-w-sm leading-relaxed">
            Create your account and start collaborating with your team today.
          </p>
          <div className="mt-10 bg-white/10 rounded-xl p-5 text-left">
            <p className="text-white text-sm font-semibold mb-3">Registration requirements:</p>
            <ul className="space-y-2 text-blue-100 text-sm">
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-green-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                Must use @ansartechnologies.my email
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-green-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                Email verification required
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-green-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                Password minimum 8 characters
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6 bg-gray-50">
        <div className="w-full max-w-md">
          <div className="lg:hidden text-center mb-8">
            <img src="/assets/img/logo.png" alt="AnSar Calendar" className="h-12 w-auto object-contain mx-auto" />
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <div className="mb-7">
              <h1 className="text-2xl font-bold text-gray-900">Create account</h1>
              <p className="text-gray-500 mt-1 text-sm">For AnSar Technologies staff only</p>
            </div>

            {error && (
              <div className="mb-5 flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
                <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                <input
                  type="text" required value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ahmad bin Abdullah"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Work Email</label>
                <div className="relative">
                  <input
                    type="email" required value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    className={`w-full px-4 py-2.5 border rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:border-transparent transition-all ${
                      form.email && !emailValid
                        ? "border-red-300 focus:ring-red-400"
                        : form.email && emailValid
                        ? "border-green-400 focus:ring-green-400"
                        : "border-gray-300 focus:ring-blue-500"
                    }`}
                    placeholder="name@ansartechnologies.my"
                  />
                  {form.email && (
                    <div className="absolute inset-y-0 right-3 flex items-center">
                      {emailValid
                        ? <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        : <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      }
                    </div>
                  )}
                </div>
                {form.email && !emailValid && (
                  <p className="text-xs text-red-500 mt-1">Must be an @ansartechnologies.my email</p>
                )}
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"} required value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                    className="w-full pl-4 pr-10 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Min. 8 characters"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {showPassword
                        ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        : <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></>
                      }
                    </svg>
                  </button>
                </div>
                {/* Password strength bar */}
                {form.password && (
                  <div className="mt-1.5 flex gap-1">
                    {[1,2,3,4].map(i => (
                      <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${
                        form.password.length >= i * 3
                          ? form.password.length >= 12 ? "bg-green-500" : form.password.length >= 8 ? "bg-yellow-400" : "bg-red-400"
                          : "bg-gray-200"
                      }`} />
                    ))}
                  </div>
                )}
              </div>

              {/* Confirm password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm Password</label>
                <input
                  type="password" required value={form.confirm}
                  onChange={e => setForm({ ...form, confirm: e.target.value })}
                  className={`w-full px-4 py-2.5 border rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:border-transparent transition-all ${
                    form.confirm && !passwordMatch
                      ? "border-red-300 focus:ring-red-400"
                      : form.confirm && passwordMatch
                      ? "border-green-400 focus:ring-green-400"
                      : "border-gray-300 focus:ring-blue-500"
                  }`}
                  placeholder="Repeat password"
                />
                {form.confirm && !passwordMatch && (
                  <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                )}
              </div>

              <button
                type="submit" disabled={loading}
                className="w-full py-2.5 bg-[#0078d4] text-white rounded-xl font-semibold text-sm hover:bg-[#106ebe] disabled:opacity-50 transition-colors flex items-center justify-center gap-2 mt-2"
              >
                {loading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Creating account...
                  </>
                ) : "Create Account"}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-gray-100 text-center">
              <p className="text-sm text-gray-500">
                Already have an account?{" "}
                <Link href="/login" className="text-[#0078d4] font-medium hover:underline">Sign in</Link>
              </p>
            </div>
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            © {new Date().getFullYear()} AnSar Technologies Sdn Bhd
          </p>
        </div>
      </div>
    </div>
  );
}

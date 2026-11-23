import Link from "next/link";
import { Laptop, ShieldCheck, ArrowRight, Gamepad2, Users, Lock } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      {/* Navigation */}
      <header className="border-b border-slate-800/80 bg-slate-900/40 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Gamepad2 className="w-5 h-5" />
            </div>
            <span className="font-bold text-white text-lg tracking-tight">Education Game</span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 transition-all border border-slate-700/60"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 rounded-xl text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 transition-all shadow-md shadow-indigo-600/20 flex items-center gap-1.5"
            >
              <span>Get Started</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-5xl mx-auto px-6 py-16 text-center my-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-6">
          <ShieldCheck className="w-4 h-4" />
          <span>Stage 1 Security & Architecture Active</span>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight mb-6 leading-tight">
          Next-Generation{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-300 to-indigo-200">
            Education Game Platform
          </span>{" "}
          with Single-Device Lock
        </h1>

        <p className="text-slate-400 text-base max-w-2xl mx-auto mb-10 leading-relaxed">
          High-performance interactive learning platform designed exclusively for desktop and laptop
          browsers. Enforces atomic device binding, credential-sharing prevention, and instant Admin
          governance.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <Link
            href="/register"
            className="w-full sm:w-auto px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl text-sm transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2"
          >
            <span>Student Registration</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/login"
            className="w-full sm:w-auto px-6 py-3.5 bg-slate-900 hover:bg-slate-800 text-slate-200 font-medium rounded-xl text-sm transition-all border border-slate-800 flex items-center justify-center gap-2"
          >
            <Lock className="w-4 h-4 text-indigo-400" />
            <span>Sign In to Platform</span>
          </Link>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="p-3 w-fit rounded-xl bg-indigo-500/10 text-indigo-400 mb-4">
              <Laptop className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-white text-base mb-2">Desktop & Laptop Only</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Enforced at request headers and client viewport. Tablets and smartphones are cleanly
              gated to ensure an optimal interactive experience.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="p-3 w-fit rounded-xl bg-emerald-500/10 text-emerald-400 mb-4">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-white text-base mb-2">Single-Device Lock</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Enforced directly inside MySQL 8 via virtual generated columns and WebCrypto non-extractable
              keys. Prevents concurrent account sharing.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="p-3 w-fit rounded-xl bg-purple-500/10 text-purple-400 mb-4">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-white text-base mb-2">Admin Governance</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Admins can log in from any device, view registered students with active device binding
              data, manage classes and dropdown order, reset device locks, and override passwords.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500">
        <p>Education Game Platform &copy; 2026. Built with Clean Architecture & Next.js.</p>
      </footer>
    </div>
  );
}

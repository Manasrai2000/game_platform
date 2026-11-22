"use client";

import React, { useEffect, useState } from "react";
import { MonitorX, Laptop } from "lucide-react";

export function DesktopGuard({ children }: { children: React.ReactNode }) {
  const [isMobile, setIsMobile] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    function checkDevice() {
      const userAgent = navigator.userAgent || "";
      const isMobileUA =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
      const isSmallScreen = window.innerWidth < 1024;
      const hasCoarsePointer = window.matchMedia("(pointer: coarse)").matches;

      // Flag mobile if user agent is mobile OR screen is mobile-sized with coarse touch
      if (isMobileUA || (isSmallScreen && hasCoarsePointer)) {
        setIsMobile(true);
      } else {
        setIsMobile(false);
      }
      setChecked(true);
    }

    checkDevice();
    window.addEventListener("resize", checkDevice);
    return () => window.removeEventListener("resize", checkDevice);
  }, []);

  if (!checked) {
    return null; // Initial render wait to avoid hydration flicker
  }

  if (isMobile) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900 p-6 text-white text-center">
        <div className="max-w-md bg-slate-800 border border-slate-700 rounded-2xl p-8 shadow-2xl">
          <div className="mx-auto w-16 h-16 bg-rose-500/10 border border-rose-500/20 rounded-full flex items-center justify-center mb-6">
            <MonitorX className="w-8 h-8 text-rose-400" />
          </div>
          <h1 className="text-2xl font-bold mb-3 tracking-tight">Desktop & Laptop Only</h1>
          <p className="text-slate-300 text-sm leading-relaxed mb-6">
            This learning platform enforces high-security single-device locking and interactive
            learning modules designed exclusively for <strong>laptops and desktop computers</strong>.
          </p>
          <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-700/50 flex items-center gap-3 text-left">
            <Laptop className="w-6 h-6 text-indigo-400 shrink-0" />
            <div className="text-xs text-slate-400">
              Please open this site on your authorized laptop or desktop browser (Google Chrome, Edge,
              or Safari) to access your courses.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

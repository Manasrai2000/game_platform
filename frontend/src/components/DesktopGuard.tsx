"use client";

import React, { useEffect, useState } from "react";
import { MonitorX, Laptop } from "lucide-react";

export function DesktopGuard({ children }: { children: React.ReactNode }) {
  const [isMobileDevice, setIsMobileDevice] = useState(false);

  useEffect(() => {
    function checkDevice() {
      const userAgent = navigator.userAgent || "";
      const isMobileUA =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
      const hasCoarsePointer = window.matchMedia("(pointer: coarse)").matches;

      if (isMobileUA || hasCoarsePointer) {
        setIsMobileDevice(true);
      } else {
        setIsMobileDevice(false);
      }
    }

    checkDevice();
    window.addEventListener("resize", checkDevice);
    return () => window.removeEventListener("resize", checkDevice);
  }, []);

  return (
    <>
      {/* 1. Device UA / Coarse Touch Overlay (Client-Side Check) */}
      {isMobileDevice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-6 text-slate-800 text-center">
          <div className="max-w-md bg-white border border-slate-200 rounded-3xl p-8 shadow-2xl">
            <div className="mx-auto w-16 h-16 bg-rose-50 border border-rose-200 rounded-full flex items-center justify-center mb-6">
              <MonitorX className="w-8 h-8 text-rose-500" />
            </div>
            <h1 className="text-2xl font-bold mb-3 tracking-tight text-slate-900">
              Desktop &amp; Laptop Only
            </h1>
            <p className="text-slate-600 text-sm leading-relaxed mb-6">
              The <strong>Education Game</strong> platform enforces high-security single-device locking designed exclusively
              for <strong>laptops and desktop computers</strong>.
            </p>
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 flex items-center gap-3 text-left">
              <Laptop className="w-6 h-6 text-indigo-600 shrink-0" />
              <div className="text-xs text-slate-600">
                Please open this site on your authorized laptop or desktop browser to access your educational games.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Responsive CSS Fallback for Small Viewports (< 1024px) */}
      <div className="hidden max-lg:flex fixed inset-0 z-40 items-center justify-center bg-slate-900/60 backdrop-blur-md p-6 text-slate-800 text-center">
        <div className="max-w-md bg-white border border-slate-200 rounded-3xl p-8 shadow-2xl">
          <div className="mx-auto w-16 h-16 bg-rose-50 border border-rose-200 rounded-full flex items-center justify-center mb-6">
            <MonitorX className="w-8 h-8 text-rose-500" />
          </div>
          <h1 className="text-2xl font-bold mb-3 tracking-tight text-slate-900">
            Desktop &amp; Laptop Only
          </h1>
          <p className="text-slate-600 text-sm leading-relaxed mb-6">
            Please resize your window or access Education Game from a laptop or desktop screen.
          </p>
        </div>
      </div>

      {/* 3. Always render children so Next.js static / instant navigation validator never drops segments */}
      <div className="min-h-full flex-1 flex flex-col">{children}</div>
    </>
  );
}

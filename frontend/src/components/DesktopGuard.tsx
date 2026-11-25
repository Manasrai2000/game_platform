"use client";

import React from "react";

export function DesktopGuard({ children }: { children: React.ReactNode }) {
  // Mobile/Tablet restriction removed: Available across desktop, laptop, tablet, and mobile
  return <div className="min-h-full flex-1 flex flex-col">{children}</div>;
}

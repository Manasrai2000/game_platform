import { Request, Response, NextFunction } from "express";

/**
 * Device Gate Middleware
 * Restriction removed per requirement: Students can log in and access from desktop, tablet, or mobile.
 */
export function desktopOnlyGate(req: Request, res: Response, next: NextFunction): void {
  next();
}

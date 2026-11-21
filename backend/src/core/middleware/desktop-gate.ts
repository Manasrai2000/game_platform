import { Request, Response, NextFunction } from "express";

/**
 * Desktop-Only Browser Gate
 * Checks low-entropy Client Hint Sec-CH-UA-Mobile (?1 = mobile, ?0 = desktop)
 * with a fallback regex for Safari/Firefox User-Agent.
 */
export function desktopOnlyGate(req: Request, res: Response, next: NextFunction): void {
  // 1. Check Sec-CH-UA-Mobile Client Hint header
  const chMobile = req.headers["sec-ch-ua-mobile"];
  if (chMobile === "?1") {
    res.status(403).json({
      success: false,
      error: {
        code: "DESKTOP_REQUIRED",
        message:
          "This platform is strictly accessible from desktop and laptop browsers only. Mobile devices and tablets are not supported.",
      },
    });
    return;
  }

  // 2. Fallback User-Agent string check for browsers without Client Hints (Firefox / Safari)
  const userAgent = req.headers["user-agent"] || "";
  const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
  if (mobileRegex.test(userAgent)) {
    res.status(403).json({
      success: false,
      error: {
        code: "DESKTOP_REQUIRED",
        message:
          "This platform is strictly accessible from desktop and laptop browsers only. Mobile devices and tablets are not supported.",
      },
    });
    return;
  }

  next();
}

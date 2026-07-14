"use client";

import { Toaster as SonnerToaster } from "sonner";

// WHY: app-wide toast host. RTL + top-center to match the Arabic-first UI;
// richColors gives distinct success/error styling (CLAUDE.md: every mutation
// shows a success + error toast).
export function Toaster() {
  return (
    <SonnerToaster
      dir="rtl"
      position="top-center"
      richColors
      closeButton
    />
  );
}

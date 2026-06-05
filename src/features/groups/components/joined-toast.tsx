"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

/**
 * JoinedToast — fires a success toast exactly once when the user lands on the
 * leaderboard after joining via invite link (?joined=1).
 *
 * The useRef guard prevents double-fire in React Strict Mode and concurrent
 * renders. Returns null — no DOM output.
 */
export function JoinedToast() {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    toast.success("¡Te uniste al grupo! 🏆");
  }, []);

  return null;
}

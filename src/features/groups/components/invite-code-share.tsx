"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/shared/ui/button";

/** WhatsApp glyph — lucide has no brand icon, so inline the logo path. */
function WhatsappIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M19.05 4.91A9.82 9.82 0 0 0 12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01zM12.05 20.15h-.01a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.11.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.23 8.24-8.23a8.2 8.2 0 0 1 8.23 8.24c0 4.54-3.7 8.23-8.24 8.23zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.12-.16.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.23.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.14-1.18-.06-.1-.22-.16-.47-.28z" />
    </svg>
  );
}

/**
 * InviteCodeShare — surfaces a group's invite code so the owner can actually
 * share it. The code IS the product here: shown big and monospaced, one tap to
 * copy, one tap to fire a prefilled WhatsApp message (the channel that matters
 * for a friends' prode). Reused by the post-create success state and by the
 * persistent "Invitar" button on the group page.
 */
export function InviteCodeShare({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  // Text-only on purpose: WhatsApp (desktop especially) treats a shared text
  // that contains a URL as a link-share and DROPS everything except the URL, so
  // the code would be lost. No newlines either (WhatsApp Web truncates at them).
  // The code lives in the body so it always survives.
  const message = `¡Sumate a mi grupo en Prode! 🏆 Entrá con el código ${code}`;
  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(message)}`;

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success("Código copiado");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("No se pudo copiar el código");
    }
  }

  return (
    <div className="grid gap-3">
      <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 py-2 pr-2 pl-4">
        <span className="flex-1 font-mono text-xl font-bold tracking-[0.25em] tabular-nums">
          {code}
        </span>
        <Button
          type="button"
          variant="pop-ghost"
          size="sm"
          onClick={copyCode}
          className="shrink-0 gap-1.5"
        >
          {copied ? (
            <Check className="size-4" aria-hidden="true" />
          ) : (
            <Copy className="size-4" aria-hidden="true" />
          )}
          {copied ? "Copiado" : "Copiar"}
        </Button>
      </div>

      <Button
        asChild
        variant="pop"
        className="h-11 w-full gap-2 text-sm font-semibold"
      >
        <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
          <WhatsappIcon className="size-4" />
          Compartir por WhatsApp
        </a>
      </Button>
    </div>
  );
}

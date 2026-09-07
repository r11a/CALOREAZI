"use client";
import { useEffect } from "react";

// Existing modal layouts share keyboard behavior without changing their markup or styling.
export function useModalAccessibility() {
  useEffect(() => {
    let active: HTMLElement | null = null;
    const previousFocus = new Map<HTMLElement, HTMLElement | null>();
    const update = () => {
      const layers = [...document.querySelectorAll<HTMLElement>(".modal-layer")];
      const next = layers.at(-1) || null;
      if (next === active) return;
      if (active && !active.isConnected) {
        const previous = previousFocus.get(active);
        if (previous?.isConnected) previous.focus({ preventScroll: true });
        previousFocus.delete(active);
      }
      active = next;
      if (!active) return;
      const panel = active.querySelector<HTMLElement>("section") || active;
      if (!previousFocus.has(active)) previousFocus.set(active, document.activeElement as HTMLElement);
      panel.setAttribute("role", "dialog");
      panel.setAttribute("aria-modal", "true");
      if (!panel.hasAttribute("aria-label") && !panel.hasAttribute("aria-labelledby"))
        panel.setAttribute("aria-label", panel.querySelector("h2,h3,header strong")?.textContent || "חלון");
      panel.tabIndex = -1;
      // Focus the panel, not a text field, so opening a meal never opens the mobile keyboard.
      panel.focus({ preventScroll: true });
    };
    const keydown = (event: KeyboardEvent) => {
      if (!active) return;
      if (event.key === "Escape") {
        const close = active.querySelector<HTMLButtonElement>("button.backdrop");
        if (close) { event.preventDefault(); close.click(); }
      }
      if (event.key !== "Tab") return;
      const panel = active.querySelector<HTMLElement>("[role=dialog]") || active;
      const buttons = [...panel.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex="0"],summary')].filter(el => el.getClientRects().length && el.getAttribute("aria-hidden") !== "true");
      const first = buttons[0]; const last = buttons.at(-1);
      if (!first) { event.preventDefault(); panel.focus(); return; }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === panel)) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !panel.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
    };
    const observer = new MutationObserver(update);
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener("keydown", keydown);
    update();
    return () => { observer.disconnect(); document.removeEventListener("keydown", keydown); };
  }, []);
}

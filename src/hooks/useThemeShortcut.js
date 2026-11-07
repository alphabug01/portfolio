import { useEffect, useState } from "react";

// Only set once the visitor switches the theme themselves. Until then the
// site follows the device setting. ("theme" was the old key, which saved
// the device setting on the first visit and then ignored later changes.)
const CHOICE_KEY = "theme-choice";
const OLD_KEY = "theme";

// Hidden switch: three quick taps on a blank part of the page.
const TAPS_TO_TOGGLE = 3;
const MAX_TAP_GAP_MS = 500; // longest pause allowed between taps
const MAX_TAP_MOVE_PX = 10; // a touch that moves further is a scroll
const INTERACTIVE =
  'a, button, input, textarea, select, label, summary, [role="button"], [contenteditable="true"]';

const darkQuery = () => window.matchMedia("(prefers-color-scheme: dark)");

function readChoice() {
  try {
    localStorage.removeItem(OLD_KEY);
    const stored = localStorage.getItem(CHOICE_KEY);
    return stored === "dark" || stored === "light" ? stored : null;
  } catch {
    return null;
  }
}

export function useThemeShortcut() {
  const [choice, setChoice] = useState(readChoice); // null = follow device
  const [deviceTheme, setDeviceTheme] = useState(() =>
    darkQuery().matches ? "dark" : "light",
  );
  const theme = choice ?? deviceTheme;

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    if (!choice) return;
    try {
      localStorage.setItem(CHOICE_KEY, choice);
    } catch {
      // Storage blocked (e.g. private mode): the choice lasts this visit only.
    }
  }, [choice]);

  // Follow the device setting live, e.g. a phone switching to dark at night.
  useEffect(() => {
    const query = darkQuery();
    const onChange = (event) => setDeviceTheme(event.matches ? "dark" : "light");
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const toggle = () =>
      setChoice((previous) => {
        const current = previous ?? (darkQuery().matches ? "dark" : "light");
        return current === "dark" ? "light" : "dark";
      });

    const onKeyDown = (event) => {
      const isShortcut =
        (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "d";
      if (!isShortcut) return;

      const tagName = event.target?.tagName;
      if (
        tagName === "INPUT" ||
        tagName === "TEXTAREA" ||
        event.target?.isContentEditable
      ) {
        return;
      }

      event.preventDefault();
      toggle();
    };

    let start = null;
    let taps = 0;
    let lastTapAt = 0;

    const onPointerDown = (event) => {
      if (event.pointerType !== "touch") return;
      start = { x: event.clientX, y: event.clientY };
    };

    const onPointerUp = (event) => {
      if (event.pointerType !== "touch" || !start) return;
      const moved =
        Math.hypot(event.clientX - start.x, event.clientY - start.y) >
        MAX_TAP_MOVE_PX;
      start = null;

      if (moved || event.target?.closest?.(INTERACTIVE)) {
        taps = 0;
        return;
      }

      taps = event.timeStamp - lastTapAt <= MAX_TAP_GAP_MS ? taps + 1 : 1;
      lastTapAt = event.timeStamp;

      if (taps >= TAPS_TO_TOGGLE) {
        taps = 0;
        toggle();
      }
    };

    const onPointerCancel = () => {
      start = null;
      taps = 0;
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("pointerdown", onPointerDown, { passive: true });
    window.addEventListener("pointerup", onPointerUp, { passive: true });
    window.addEventListener("pointercancel", onPointerCancel, { passive: true });
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerCancel);
    };
  }, []);
}

import { useEffect, useCallback } from "react";
import { useLocation } from "wouter";

// #175: Global keyboard shortcuts
export function useKeyboardShortcuts() {
  const [, setLocation] = useLocation();

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Ignore when typing in inputs/textareas
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const isEditable = (e.target as HTMLElement)?.isContentEditable;
      if (isEditable) return;

      // Ctrl/Cmd + K — open search
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setLocation("/search");
        return;
      }

      // g then h — go home (sequential, not simultaneous)
      // We handle single-key shortcuts here:
      switch (e.key) {
        case "?":
          // Show keyboard shortcuts help dialog — dispatched as a custom event
          window.dispatchEvent(new CustomEvent("show-shortcuts-help"));
          break;
      }
    },
    [setLocation]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}

// List of shortcuts for the help overlay
export const SHORTCUTS = [
  { keys: "Ctrl + K", description: "Open global search" },
  { keys: "?",        description: "Show keyboard shortcuts" },
];

import { useSyncExternalStore } from "react";

const KEY = "sidebar:pinned";

let pinned =
  typeof window !== "undefined" && window.localStorage.getItem(KEY) === "1";

const listeners = new Set<() => void>();

export function getSidebarPinned() {
  return pinned;
}

export function setSidebarPinned(v: boolean) {
  pinned = v;
  try {
    window.localStorage.setItem(KEY, v ? "1" : "0");
  } catch {}
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function useSidebarPinned() {
  return useSyncExternalStore(
    subscribe,
    () => pinned,
    () => false,
  );
}

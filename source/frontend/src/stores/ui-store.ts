"use client";

import { create } from "zustand";

type Theme = "light" | "dark" | "system";

interface UiState {
  isSidebarOpen: boolean;
  isMobile: boolean;
  theme: Theme;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setIsMobile: (isMobile: boolean) => void;
  setTheme: (theme: Theme) => void;
}

export const useUiStore = create<UiState>((set) => ({
  isSidebarOpen: true,
  isMobile: false,
  theme: "light",
  toggleSidebar: () =>
    set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setSidebarOpen: (open) => set({ isSidebarOpen: open }),
  setIsMobile: (isMobile) => set({ isMobile }),
  setTheme: (theme) => set({ theme }),
}));

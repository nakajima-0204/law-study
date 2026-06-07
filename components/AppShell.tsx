"use client";

import MenuDrawer from "@/components/MenuDrawer";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <MenuDrawer />
      {children}
    </>
  );
}

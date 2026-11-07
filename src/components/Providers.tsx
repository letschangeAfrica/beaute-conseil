"use client";
import { SessionProvider } from "next-auth/react";
import { ServiceWorker } from "./ServiceWorker";
import { SyncManager } from "./SyncManager";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <SyncManager />
      <ServiceWorker />
      {children}
    </SessionProvider>
  );
}

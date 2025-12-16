"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import axios from "axios";

interface VendorBillsBadgeContextType {
  newVendorBillsCount: number;
  markVendorBillsAsSeen: () => void;
  refresh: () => void;
}

const VendorBillsBadgeContext = createContext<
  VendorBillsBadgeContextType | undefined
>(undefined);

const STORAGE_KEY = "vendorBillsLastSeenAt";

function getLastSeenAt() {
  if (typeof window === "undefined") return 0;
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? Number(raw) : 0;
}

function setLastSeenAt(ts: number) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, String(ts));
}

export function VendorBillsBadgeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [newCount, setNewCount] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const lastSeenAt = getLastSeenAt();

      const [farmerRes, agentRes] = await Promise.all([
        axios.get("/api/former-loading"),
        axios.get("/api/agent-loading"),
      ]);

      const farmers = (farmerRes.data?.data ?? []) as any[];
      const agents = (agentRes.data?.data ?? []) as any[];

      // IMPORTANT: your API must return createdAt for each row
      const all = [...farmers, ...agents];

      const fresh = all.filter((x) => {
        const t = x?.createdAt ? new Date(x.createdAt).getTime() : 0;
        return t > lastSeenAt;
      });

      setNewCount(fresh.length);
    } catch (err) {
      console.error("Failed to refresh vendor bills badge count", err);
      setNewCount(0);
    }
  }, []);

  useEffect(() => {
    refresh();

    const handleFocus = () => refresh();
    window.addEventListener("focus", handleFocus);

    // optional: auto refresh every 15s
    const interval = window.setInterval(refresh, 15000);

    return () => {
      window.removeEventListener("focus", handleFocus);
      window.clearInterval(interval);
    };
  }, [refresh]);

  const markVendorBillsAsSeen = useCallback(() => {
    // mark "now" as seen
    setLastSeenAt(Date.now());
    setNewCount(0);
  }, []);

  return (
    <VendorBillsBadgeContext.Provider
      value={{ newVendorBillsCount: newCount, markVendorBillsAsSeen, refresh }}
    >
      {children}
    </VendorBillsBadgeContext.Provider>
  );
}

export function useVendorBillsBadge() {
  const context = useContext(VendorBillsBadgeContext);
  if (!context) {
    throw new Error(
      "useVendorBillsBadge must be used within VendorBillsBadgeProvider"
    );
  }
  return context;
}

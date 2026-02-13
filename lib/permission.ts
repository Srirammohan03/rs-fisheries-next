// lib\permission.ts
import { ROLE_PERMISSIONS, Role, Permission } from "./rbac";

// CLIENT permission check (FAST, no DB)
export function hasPermission(role: string | undefined, permission: string) {
    if (!role) return false;

    // admin always allowed
    if (role === "admin") return true;

    // fallback basic permissions (until DB loads)
    const basic: Record<string, string[]> = {
        finance: ["dashboard.view", "partyBills.view", "payments.view", "receipts.view", "stock.view"],
        sales: ["dashboard.view", "loadings.view", "stock.view", "partyBills.view"],
        clerk: ["dashboard.view", "loadings.view"],
    };

    const perms = basic[role] || [];
    return perms.includes(permission);
}




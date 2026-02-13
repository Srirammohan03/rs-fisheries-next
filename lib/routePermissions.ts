// lib\routePermissions.ts
export const ROUTE_PERMISSIONS: Record<string, string> = {
    "/dashboard": "dashboard.view",

    "/loadings": "loadings.view",

    "/stocks": "stock.view",
    "/vendor-bills": "partyBills.view",
    "/client-bills": "partyBills.view",

    "/payments": "payments.view",
    "/receipts": "receipts.view",

    "/vehicles": "vehicles.view",
    "/client": "clients.view",

    "/employee": "employees.view",
    "/teams-members": "teams.view",

    "/audit-logs": "audit.view",
};

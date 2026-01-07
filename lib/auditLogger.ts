import { Prisma } from "@prisma/client";
import prisma from "./prisma";

type AuditAction = "CREATE" | "UPDATE" | "DELETE" | "STATUS_CHANGE";

type LogAuditParams = {
  user: {
    id: string;
    role: string;
  };
  module: string;
  label?: string;
  action: AuditAction;
  recordId: string;
  oldValues?: Prisma.InputJsonValue | null;
  newValues?: Prisma.InputJsonValue | null;
  request: Request;
};

export async function logAudit({
  user,
  module,
  action,
  recordId,
  oldValues,
  newValues,
  request,
  label,
}: LogAuditParams) {
  await prisma.auditLog.create({
    data: {
      userId: user.id,
      userRole: user.role,
      module,
      action,
      recordId,
      oldValues: oldValues ?? undefined,
      newValues: newValues ?? undefined,
      ipAddress:
        request.headers.get("x-forwarded-for") ??
        request.headers.get("x-real-ip"),
      userAgent: request.headers.get("user-agent"),
      label,
    },
  });
}

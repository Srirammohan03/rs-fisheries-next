import { diffObjects } from "@/lib/auditDiff";
import { logAudit } from "@/lib/auditLogger";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/withAuth";
import { TicketXIcon } from "lucide-react";
import { NextResponse } from "next/server";

const TRAY_KG = 35;

type Params = {
  id: string;
};

type GroupedResult = {
  varietyCode: string;
  _sum: { totalKgs: number | null };
};

async function getNetKgsByCodes(codes: string[]) {
  const [former, agent, client] = await Promise.all([
    prisma.formerItem.groupBy({
      by: ["varietyCode"],
      where: { varietyCode: { in: codes } },
      _sum: { totalKgs: true },
    }),
    prisma.agentItem.groupBy({
      by: ["varietyCode"],
      where: { varietyCode: { in: codes } },
      _sum: { totalKgs: true },
    }),
    prisma.clientItem.groupBy({
      by: ["varietyCode"],
      where: { varietyCode: { in: codes } },
      _sum: { totalKgs: true },
    }),
  ]);

  const map = (arr: GroupedResult[]) =>
    Object.fromEntries(
      arr.map((x) => [x.varietyCode, Number(x._sum.totalKgs ?? 0)])
    );

  const f = map(former as GroupedResult[]);
  const a = map(agent as GroupedResult[]);
  const c = map(client as GroupedResult[]);

  const net: Record<string, number> = {};
  for (const code of codes) {
    net[code] = Math.max(0, (f[code] || 0) + (a[code] || 0) - (c[code] || 0));
  }
  return net;
}

export const PATCH = withAuth(
  async (request: Request, { params }: { params: Promise<Params> }) => {
    const { id } = await params;
    if (!id)
      return NextResponse.json(
        { message: "Item ID required" },
        { status: 400 }
      );

    try {
      const body = (await request.json()) as {
        noTrays?: number;
        loose?: number;
        pricePerKg?: number;
      };

      const updated = await prisma.$transaction(async (tx) => {
        const existing = await tx.clientItem.findUnique({
          where: { id },
          include: {
            loading: {
              select: { billNo: true },
            },
          },
        });
        if (!existing) {
          throw new Error("Item not found");
        }

        const isQtyChange =
          body.noTrays !== undefined || body.loose !== undefined;

        const nextTrays =
          body.noTrays !== undefined
            ? Math.max(0, Number(body.noTrays) || 0)
            : existing.noTrays;

        const nextLoose =
          body.loose !== undefined
            ? Math.max(0, Number(body.loose) || 0)
            : Number(existing.loose || 0);

        const trayKgs = nextTrays * TRAY_KG;
        const nextTotalKgs = trayKgs + nextLoose;

        if (isQtyChange) {
          const varietyCode = existing.varietyCode;

          const [formerAgg, agentAgg] = await Promise.all([
            tx.formerItem.aggregate({
              where: { varietyCode },
              _sum: { totalKgs: true },
            }),
            tx.agentItem.aggregate({
              where: { varietyCode },
              _sum: { totalKgs: true },
            }),
          ]);

          const incoming =
            Number(formerAgg._sum.totalKgs || 0) +
            Number(agentAgg._sum.totalKgs || 0);

          const usedAgg = await tx.clientItem.aggregate({
            where: { varietyCode, id: { not: id } },
            _sum: { totalKgs: true },
          });

          const usedByOthers = Number(usedAgg._sum.totalKgs || 0);
          const maxAllowedForThisItem = Math.max(0, incoming - usedByOthers);

          if (nextTotalKgs > maxAllowedForThisItem) {
            throw new Error(
              `Stock exceeded for ${varietyCode}. Available ${maxAllowedForThisItem.toFixed(
                2
              )} Kgs`
            );
          }
        }

        const result = await tx.clientItem.update({
          where: { id },
          data: {
            noTrays: body.noTrays !== undefined ? nextTrays : undefined,
            loose: body.loose !== undefined ? nextLoose : undefined,
            trayKgs,
            totalKgs: nextTotalKgs,
            pricePerKg:
              body.pricePerKg !== undefined
                ? Math.max(0, Number(body.pricePerKg) || 0)
                : undefined,
          },
        });

        const { oldValues, newValues } = diffObjects(existing, result);

        if (Object.keys(newValues).length > 0) {
          await logAudit({
            user: (request as any).user,
            action: "UPDATE",
            module: "Client Bills",
            recordId: result.id,
            request,
            oldValues,
            newValues,
            label: `Client Bills updated for bill: ${existing.loading.billNo}`,
          });
        }

        return result;
      });

      return NextResponse.json({ success: true, item: updated });
    } catch (err: any) {
      console.error("PATCH client item failed:", err);
      return NextResponse.json(
        { message: err.message || "Update failed" },
        { status: 500 }
      );
    }
  }
);

/* ================= DELETE ================= */
export const DELETE = withAuth(
  async (request: Request, { params }: { params: Promise<Params> }) => {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { message: "Item ID required" },
        { status: 400 }
      );
    }

    try {
      const result = await prisma.$transaction(async (tx) => {
        const item = await tx.clientItem.findUnique({
          where: { id },
          include: { loading: true },
        });
        if (!item) {
          throw new Error("Item not found");
        }

        // snapshot before delete
        const itemSnapshot = {
          varietyCode: item.varietyCode,
          noTrays: item.noTrays,
          loose: item.loose,
          totalKgs: item.totalKgs,
          pricePerKg: item.pricePerKg,
          billNo: item.loading.billNo,
          name: item.loading.clientName,
        };

        await tx.clientItem.delete({ where: { id } });

        await logAudit({
          user: (request as any).user,
          action: "DELETE",
          module: "Client Item",
          recordId: id,
          request,
          oldValues: itemSnapshot,
          newValues: null,
        });

        const remaining = await tx.clientItem.count({
          where: { clientLoadingId: item.clientLoadingId },
        });

        let billDeleted = false;

        if (remaining === 0) {
          const loading = await tx.clientLoading.findUnique({
            where: { id: item.clientLoadingId },
          });

          if (loading) {
            await tx.clientLoading.delete({
              where: { id: item.clientLoadingId },
            });

            await logAudit({
              user: (request as any).user,
              action: "DELETE",
              module: "Client Loading",
              recordId: loading.id,
              request,
              oldValues: {
                billNo: loading.billNo ?? null,
                totalKgs: loading.totalKgs,
                grandTotal: loading.grandTotal,
                name: loading.clientName,
              },
              newValues: null,
            });

            billDeleted = true;
          }
        }

        return { deletedBill: billDeleted };
      });

      return NextResponse.json({ success: true, ...result });
    } catch (err: any) {
      console.error("DELETE client item failed:", err);

      return NextResponse.json(
        { message: err.message || "Delete failed" },
        { status: 500 }
      );
    }
  }
);

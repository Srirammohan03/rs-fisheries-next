// app\api\client\[id]\route.ts
import { diffObjects } from "@/lib/auditDiff";
import { logAudit } from "@/lib/auditLogger";
import prisma from "@/lib/prisma";
import { withAuth } from "@/lib/withAuth";
import { ApiError } from "@/utils/ApiError";
import { apiHandler } from "@/utils/apiHandler";
import { ApiResponse } from "@/utils/ApiResponse";
import { GstType, BalanceType } from "@prisma/client";
import { NextResponse } from "next/server";

export const PATCH = withAuth(
  apiHandler(async (req: Request, context: any) => {
    const { id } = await context.params;

    if (!id) {
      throw new ApiError(400, "Client ID not received");
    }

    const formData = await req.formData();

    const optionalString = (key: string) => {
      const value = formData.get(key);
      return value !== null ? String(value).trim() : undefined;
    };

    const optionalNumber = (key: string) => {
      const value = formData.get(key);
      return value !== null ? Number(value) : undefined;
    };

    const data: any = {};

    const partyName = optionalString("partyName");
    if (partyName !== undefined) data.partyName = partyName;

    const partyGroup = optionalString("partyGroup");
    if (partyGroup !== undefined) data.partyGroup = partyGroup;

    const phone = optionalString("phone");
    if (phone !== undefined) data.phone = phone;

    const email = optionalString("email");
    if (email !== undefined) data.email = email;

    const gstTypeRaw = optionalString("gstType");
    if (gstTypeRaw !== undefined) {
      data.gstType = gstTypeRaw as GstType;
    }

    const gstin = optionalString("gstin");
    if (gstin !== undefined) data.gstin = gstin;

    const state = optionalString("state");
    if (state !== undefined) data.state = state;

    const billingAddress = optionalString("billingAddress");
    if (billingAddress !== undefined) data.billingAddress = billingAddress;

    const openingBalance = optionalNumber("openingBalance");
    if (openingBalance !== undefined) {
      if (Number.isNaN(openingBalance)) {
        throw new ApiError(400, "openingBalance must be a valid number");
      }
      data.openingBalance = openingBalance;
    }

    const balanceTypeRaw = optionalString("balanceType");
    if (balanceTypeRaw !== undefined) {
      data.balanceType = balanceTypeRaw as BalanceType;
    }

    const creditLimit = optionalNumber("creditLimit");
    if (creditLimit !== undefined) {
      if (Number.isNaN(creditLimit)) {
        throw new ApiError(400, "creditLimit must be a valid number");
      }
      data.creditLimit = creditLimit;
    }

    const referenceNo = optionalString("referenceNo");
    if (referenceNo !== undefined) data.referenceNo = referenceNo;

    const accountNumber = optionalString("accountNumber");
    if (accountNumber !== undefined) data.accountNumber = accountNumber;

    const ifsc = optionalString("ifsc");
    if (ifsc !== undefined) data.ifsc = ifsc;

    const bankName = optionalString("bankName");
    if (bankName !== undefined) data.bankName = bankName;

    const bankAddress = optionalString("bankAddress");
    if (bankAddress !== undefined) data.bankAddress = bankAddress;

    const paymentdetails = optionalString("paymentdetails");
    if (paymentdetails !== undefined) data.paymentdetails = paymentdetails;

    const isActiveRaw = formData.get("isActive");
    if (isActiveRaw !== null) {
      data.isActive = isActiveRaw === "true";
    }

    if (Object.keys(data).length === 0) {
      throw new ApiError(400, "No fields provided for update");
    }

    const updatedClient = await prisma.$transaction(async (tx) => {
      const oldClient = await tx.client.findUnique({
        where: { id },
      });
      if (!oldClient) throw new ApiError(404, "Client not found");

      const newClient = await tx.client.update({
        where: { id },
        data,
      });

      const { oldValues, newValues } = diffObjects(oldClient, newClient);
      if (Object.keys(newValues).length)
        await logAudit({
          user: (req as any).user,
          action: "UPDATE",
          module: "Client",
          recordId: newClient.id,
          request: req,
          newValues,
          oldValues,
        });
      return newClient;
    });

    return NextResponse.json(
      new ApiResponse(200, updatedClient, "Client updated successfully"),
      { status: 200 }
    );
  })
);

export const GET = apiHandler(async (_req: Request, context: any) => {
  const { id } = await context.params;

  if (!id) {
    throw new ApiError(400, "Client ID not received");
  }

  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      payments: {
        select: {
          clientKey: true,
          clientName: true,
          date: true,
          amount: true,
          paymentMode: true,
          isInstallment: true,
          client: {
            select: {
              billNo: true,
            },
          },
        },
      },
      loadings: {
        select: {
          billNo: true,
          date: true,
          vehicle: {
            select: {
              ownership: true,
              vehicleNumber: true,
            },
          },
          tripStatus: true,
          vehicleNo: true,
          startedAt: true,
          completedAt: true,
          totalTrays: true,
          totalLooseKgs: true,
          totalTrayKgs: true,
          totalKgs: true,
          totalPrice: true,
          dispatchChargesTotal: true,
          packingAmountTotal: true,
          grandTotal: true,
          items: {
            select: {
              varietyCode: true,
              noTrays: true,
              trayKgs: true,
              loose: true,
              totalKgs: true,
              pricePerKg: true,
              totalPrice: true,
            },
          },
        },
      },
    },
  });

  return NextResponse.json(
    new ApiResponse(200, client, "Client fetched successfully"),
    { status: 200 }
  );
});

export const DELETE = withAuth(
  apiHandler(async (req: Request, context: any) => {
    const { id } = await context.params;

    if (!id) throw new ApiError(400, "Client ID not received");

    await prisma.$transaction(async (tx) => {
      const client = await tx.client.findUnique({ where: { id } });
      if (!client) throw new ApiError(404, "Client not found");

      await tx.client.delete({ where: { id } });

      await logAudit({
        user: (req as any).user,
        action: "DELETE",
        module: "Client",
        recordId: id,
        request: req,
        oldValues: {
          partyName: client.partyName,
          partyGroup: client.partyGroup,
          phone: client.phone,
          email: client.email,
          gstType: client.gstType,
          gstin: client.gstin,
          isActive: client.isActive,
        },
        newValues: null,
      });
    });

    return NextResponse.json(
      new ApiResponse(200, null, "Client deleted successfully"),
      { status: 200 }
    );
  })
);

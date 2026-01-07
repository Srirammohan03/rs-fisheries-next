// app\api\client\route.ts
import { logAudit } from "@/lib/auditLogger";
import prisma from "@/lib/prisma";
import { withAuth } from "@/lib/withAuth";
import { ApiError } from "@/utils/ApiError";
import { apiHandler } from "@/utils/apiHandler";
import { ApiResponse } from "@/utils/ApiResponse";
import { BalanceType, GstType } from "@prisma/client";
import { NextResponse } from "next/server";

export const POST = withAuth(
  apiHandler(async (req: Request) => {
    const formData = await req.formData();

    const requiredString = (key: string) => {
      const value = formData.get(key);
      if (!value) throw new ApiError(400, `${key} is required`);
      return String(value).trim();
    };

    const optionalString = (key: string) => {
      const value = formData.get(key);
      return value ? String(value).trim() : null;
    };

    const partyName = requiredString("partyName");
    const partyGroup = optionalString("partyGroup");
    const phone = requiredString("phone");
    const email = optionalString("email");

    const gstType = requiredString("gstType") as GstType;
    const gstin = optionalString("gstin");
    const state = optionalString("state");

    const billingAddress = requiredString("billingAddress");

    const openingBalance = Number(requiredString("openingBalance"));
    const balanceType = requiredString("balanceType") as BalanceType;
    const creditLimit = formData.get("creditLimit")
      ? Number(formData.get("creditLimit"))
      : null;

    const referenceNo = optionalString("referenceNo");
    const accountNumber = optionalString("accountNumber");
    const ifsc = optionalString("ifsc");
    const bankName = optionalString("bankName");
    const bankAddress = optionalString("bankAddress");
    const paymentdetails = optionalString("paymentdetails");

    const isActive =
      formData.get("isActive") === null
        ? true
        : formData.get("isActive") === "true";

    if (Number.isNaN(openingBalance)) {
      throw new ApiError(400, "openingBalance must be a valid number");
    }

    if (creditLimit !== null && Number.isNaN(creditLimit)) {
      throw new ApiError(400, "creditLimit must be a valid number");
    }

    const client = await prisma.$transaction(async (tx) => {
      const createdClient = await tx.client.create({
        data: {
          partyName,
          partyGroup,
          phone,
          email,
          gstType,
          gstin,
          state,
          billingAddress,
          openingBalance,
          balanceType,
          creditLimit,
          referenceNo,
          accountNumber,
          ifsc,
          bankName,
          bankAddress,
          paymentdetails,
          isActive,
        },
      });

      await logAudit({
        user: (req as any).user,
        action: "CREATE",
        module: "Client",
        recordId: createdClient.id,
        request: req,
        newValues: {
          partyName: createdClient.partyName,
          partyGroup: createdClient.partyGroup,
          phone: createdClient.phone,
          email: createdClient.email,
          gstType: createdClient.gstType,
          gstin: createdClient.gstin,
          openingBalance: createdClient.openingBalance,
          balanceType: createdClient.balanceType,
          isActive: createdClient.isActive,
        },
        oldValues: null,
      });

      return createdClient;
    });

    return NextResponse.json(
      new ApiResponse(201, client, "Client created successfully"),
      { status: 201 }
    );
  })
);

export const GET = apiHandler(async (req: Request) => {
  const clients = await prisma.client.findMany({
    orderBy: { createdAt: "desc" },
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
    new ApiResponse(200, clients, "Client fetched successfully"),
    { status: 200 }
  );
});

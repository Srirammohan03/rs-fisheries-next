// app\api\client\[id]\route.ts
import prisma from "@/lib/prisma";
import { ApiError } from "@/utils/ApiError";
import { apiHandler } from "@/utils/apiHandler";
import { ApiResponse } from "@/utils/ApiResponse";
import { GstType, BalanceType } from "@prisma/client";
import { NextResponse } from "next/server";

export const PUT = apiHandler(async (req: Request, context: any) => {
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

  const updatedClient = await prisma.client.update({
    where: { id },
    data,
  });

  return NextResponse.json(
    new ApiResponse(200, updatedClient, "Client updated successfully"),
    { status: 200 }
  );
});

export const DELETE = apiHandler(async (_req: Request, context: any) => {
  const { id } = await context.params;

  if (!id) {
    throw new ApiError(400, "Client ID not received");
  }

  const deletedClient = await prisma.client.delete({
    where: { id },
  });

  return NextResponse.json(
    new ApiResponse(200, null, "Client deleted successfully"),
    { status: 200 }
  );
});

import { ApiError } from "@/utils/ApiError";
import crypto from "crypto";
import path from "path";
import fs from "fs/promises";
import prisma from "./prisma";

const generateEmpId = async (): Promise<string> => {
  const counter = await prisma.counter.update({
    where: { id: "EMPLOYEE" },
    data: { value: { increment: 1 } },
  });

  return `RS-EMP-${String(counter.value).padStart(4, "0")}`;
};

const uploadEmployeeFile = async (
  file: File,
  folder: string
): Promise<string> => {
  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
  ];

  if (file.size > 5 * 1024 * 1024) {
    throw new ApiError(400, "File size must be under 5MB");
  }

  if (!allowedTypes.includes(file.type)) {
    throw new ApiError(400, "Invalid file type");
  }

  const ext = file.name.split(".").pop() || "jpg";
  const fileName = `${crypto.randomUUID()}.${ext}`;

  //  Physical storage path
  const uploadDir = path.join(process.cwd(), "public", "uploads", folder);
  await fs.mkdir(uploadDir, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  const filePath = path.join(uploadDir, fileName);
  await fs.writeFile(filePath, buffer);

  //  Public URL (THIS goes to DB)
  return `/uploads/${folder}/${fileName}`;
};

const safeUnlink = async (fileUrl?: string | null) => {
  if (!fileUrl) return;
  const filePath = path.join(process.cwd(), "public", fileUrl);
  await fs.unlink(filePath).catch(() => {});
};

export { generateEmpId, uploadEmployeeFile, safeUnlink };

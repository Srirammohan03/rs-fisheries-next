import { ApiError } from "@/utils/ApiError";

// Reusable date parser
export const parseDate = (value: any) => {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d.getTime()))
    throw new ApiError(400, `Invalid date format: ${value}`);
  return d;
};

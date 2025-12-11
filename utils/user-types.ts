import { z } from "zod";

export const UserValidationSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).optional(),
  name: z.string().optional(),
  role: z.enum([
    "admin",
    "finance",
    "clerk",
    "documentation",
    "sales",
    "readOnly",
  ]),
});

export type UserFormValues = z.infer<typeof UserValidationSchema>;

export interface User {
  id: string;
  email: string;
  name?: string | null;
  role: "admin" | "finance" | "clerk" | "documentation" | "sales" | "readOnly";
  createdAt: string;
}

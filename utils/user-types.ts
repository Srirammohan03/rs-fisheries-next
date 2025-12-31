import { Employee } from "@/lib/types";
import { z } from "zod";

export const UserValidationSchema = z.object({
  employeeId: z.string().min(1, "Please select an employee").uuid(),
  email: z.email().min(1, "Please fill the email"),
  password: z
    .string()
    .optional()
    .refine(
      (val) => !val || val.length >= 6,
      "Password must be at least 6 characters"
    ),
});

export type UserFormValues = z.infer<typeof UserValidationSchema>;

export interface User {
  id: string;
  employee: Employee;
  employeeId: string;
  email: string;
  createdAt: string;
}

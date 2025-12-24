import { JoiningFormValues } from "./schema";

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface Employee extends JoiningFormValues {
  id: string;
  employeeId: string;
  photo: string;
  aadhaarProof: string;
  panProof: string;
  createdAt: string;
  updatedAt: string;
}

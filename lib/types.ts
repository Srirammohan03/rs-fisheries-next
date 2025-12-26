import { JoiningFormValues } from "./schema";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

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

export const useEmployee = () => {
  return useQuery<ApiResponse<Employee[]>, Error>({
    queryKey: ["employees"],
    queryFn: async (): Promise<ApiResponse<Employee[]>> => {
      const res = await axios.get("/api/employee");
      return res.data;
    },
    refetchOnMount: "always",
  });
};

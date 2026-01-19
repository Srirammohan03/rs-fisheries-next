import { JoiningFormValues } from "./schema";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import axios from "axios";

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
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

export const useEmployee = ({
  page,
  search,
  limit,
  fromDate,
  toDate,
  designation,
  shiftType,
  sortOrder,
}: {
  page: number;
  limit: number;
  search?: string;
  sortOrder?: "new" | "old";
  shiftType?: string;
  designation?: string;
  fromDate?: Date | null;
  toDate?: Date | null;
}) => {
  return useQuery<ApiResponse<Employee[]>, Error>({
    queryKey: [
      "employees",
      page,
      limit,
      search,
      sortOrder,
      shiftType,
      designation,
      fromDate?.toISOString(),
      toDate?.toISOString(),
    ],
    queryFn: async (): Promise<ApiResponse<Employee[]>> => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });

      if (search) params.set("search", search);
      if (sortOrder) params.set("sort", sortOrder);
      if (shiftType) params.set("shiftType", shiftType);
      if (designation) params.set("designation", designation);
      if (fromDate) params.set("fromDate", fromDate.toISOString());
      if (toDate) params.set("toDate", toDate.toISOString());

      const res = await axios.get(`/api/employee?${params}`, {
        withCredentials: true,
      });
      return res.data;
    },
    refetchOnMount: "always",
    placeholderData: keepPreviousData,
  });
};

export const useEmployeeDropDown = () => {
  return useQuery<ApiResponse<Employee[]>, Error>({
    queryKey: ["employees"],
    queryFn: async (): Promise<ApiResponse<Employee[]>> => {
      const res = await axios.get("/api/employee/drop-down");
      return res.data;
    },
    staleTime: 0,
  });
};

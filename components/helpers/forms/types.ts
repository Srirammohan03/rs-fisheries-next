import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { z } from "zod";

const indianVehicleNumberRegex = /^[A-Z]{2}\s[0-9]{2}\s[A-Z]{1,3}\s[0-9]{1,4}$/;

export const ownSchema = z.object({
  vehicleNumber: z
    .string()
    .min(1, "Required")
    .regex(
      indianVehicleNumberRegex,
      "Invalid vehicle number format (e.g., MH 12 AB 1234)"
    ),

  manufacturer: z.string().optional(),
  model: z.string().optional(),
  yearOfManufacture: z.string().optional(),
  fuelType: z.enum(["DIESEL", "PETROL", "CNG", "ELECTRIC"], {
    error: "Fuel type is required",
  }),

  engineNumber: z.string().optional(),
  chassisNumber: z.string().optional(),

  capacityInTons: z.string().optional(),
  bodyType: z.string().optional(),

  rcValidity: z.string().optional(),
  insuranceExpiry: z.string().optional(),
  fitnessExpiry: z.string().optional(),
  pollutionExpiry: z.string().optional(),
  permitExpiry: z.string().optional(),
  roadTaxExpiry: z.string().optional(),

  assignedDriverId: z.string().optional(),
  remarks: z.string().optional(),
});

export type OwnFormType = z.infer<typeof ownSchema>;

export interface Vehicle extends OwnFormType {
  id: string;
  assignedDriver?: {
    id: string;
    name: string;
  } | null;
}

export interface PaginatedResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface Props {
  vehicle: Vehicle;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  // onSuccess: () => void;
}

export const useAvalibleDrivers = () => {
  return useQuery({
    queryKey: ["available-drivers"],
    queryFn: async () => {
      const { data: res } = await axios.get("/api/driver/available");
      return res.data;
    },
  });
};

// EDIT

export const rentSchema = z.object({
  vehicleNumber: z.string().min(1, "Vehicle number is required"),
  rentalAgency: z.string().min(1, "Rental agency is required"),
  rentalRatePerDay: z.string().min(1, "Daily rate is required"),
  assignedDriverId: z.string().optional(),
  remarks: z.string().optional(),
});

export type RentFormType = z.infer<typeof rentSchema>;

export interface RentVehicle extends RentFormType {
  id: string;
  assignedDriver?: {
    id: string;
    name: string;
  } | null;
}

export interface RentProps {
  vehicle: RentVehicle;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

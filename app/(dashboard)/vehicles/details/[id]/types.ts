export interface Driver {
  id: string;
  name: string;
  phone: string;
  licenseNumber: string;
  address: string;
  age: number;
  aadharNumber: string;
}

export interface Trip {
  id: string;
  loadType: string;
  billNo: string;
  name: string;
  partyName: string;
  village: string;
  date: string;
  totalKgs: number;
  totalPrice: number;
  transportCharges: number;
  grandTotal: number;
}

export interface Vehicle {
  id: string;
  vehicleNumber: string;
  ownership: "RENT" | "OWN";
  manufacturer: string;
  model: string;
  yearOfManufacture: number;
  fuelType: string;
  engineNumber: string;
  chassisNumber: string;
  capacityInTons: number;
  bodyType: string;
  rcValidity: string;
  insuranceExpiry: string;
  fitnessExpiry: string;
  pollutionExpiry: string | null;
  permitExpiry: string | null;
  roadTaxExpiry: string;
  isActive: boolean;
  assignedDriver: Driver | null;
  trips: Trip[];
}

export interface ApiResponse {
  success: boolean;
  data: {
    vehicle: Vehicle;
    trips: Trip[];
  };
}

"use client";

import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Pencil, Trash } from "lucide-react";

const EmployeeDetailPage = () => {
  const { id } = useParams();
  const router = useRouter();

  // Replace this with API / React Query
  const employee = {
    id,
    name: "Ravi Kumar",
    email: "ravi.kumar@company.com",
    phone: "9876543210",
    department: "Engineering",
    designation: "Software Engineer",
    doj: "2024-01-15",
    status: "Active",
    gender: "Male",
    aadhaar: "XXXX-XXXX-1234",
    address: "Hyderabad, Telangana",
    profileImage: "",
    documents: [
      { name: "Aadhaar Card", url: "#" },
      { name: "PAN Card", url: "#" },
      { name: "Offer Letter", url: "#" },
    ],
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Employee Details
          </h1>
          <p className="text-sm text-muted-foreground">
            Employee ID: {employee.id}
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline">
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button variant="destructive">
            <Trash className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      {/* Profile Card */}
      <Card>
        <CardContent className="flex flex-col sm:flex-row gap-6 py-6">
          <Avatar className="h-24 w-24">
            <AvatarImage src={employee.profileImage} />
            <AvatarFallback>
              {employee.name
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </AvatarFallback>
          </Avatar>

          <div className="space-y-2">
            <h2 className="text-xl font-semibold">{employee.name}</h2>
            <p className="text-sm text-muted-foreground">
              {employee.designation} · {employee.department}
            </p>

            <div className="flex gap-2">
              <Badge variant="outline">{employee.status}</Badge>
              <Badge variant="secondary">Joined {employee.doj}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Information Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Personal Info */}
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>Basic employee details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <InfoRow label="Email" value={employee.email} />
            <InfoRow label="Phone" value={employee.phone} />
            <InfoRow label="Gender" value={employee.gender} />
            <InfoRow label="Aadhaar" value={employee.aadhaar} />
            <InfoRow label="Address" value={employee.address} />
          </CardContent>
        </Card>

        {/* Work Info */}
        <Card>
          <CardHeader>
            <CardTitle>Work Information</CardTitle>
            <CardDescription>Employment details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <InfoRow label="Department" value={employee.department} />
            <InfoRow label="Designation" value={employee.designation} />
            <InfoRow label="Date of Joining" value={employee.doj} />
            <InfoRow label="Status" value={employee.status} />
          </CardContent>
        </Card>
      </div>

      {/* Documents */}
      <Card>
        <CardHeader>
          <CardTitle>Documents</CardTitle>
          <CardDescription>Uploaded employee documents</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {employee.documents.map((doc) => (
            <div
              key={doc.name}
              className="flex items-center justify-between border rounded-lg px-4 py-2"
            >
              <span className="text-sm font-medium">{doc.name}</span>
              <Button variant="outline" size="sm">
                View
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default EmployeeDetailPage;

/* Reusable row component */
const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between gap-4">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-medium text-right">{value}</span>
  </div>
);

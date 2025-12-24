"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, EllipsisVertical, Plus } from "lucide-react";
import { generateJoiningFormPDF } from "./components/generateJoiningFormPDF";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const employees = [
  {
    id: "EMP001",
    name: "Ravi Kumar",
    department: "Engineering",
    designation: "Software Engineer",
    doj: "2024-01-15",
    status: "Active",
  },
  {
    id: "EMP002",
    name: "Anjali Sharma",
    department: "HR",
    designation: "HR Executive",
    doj: "2023-11-02",
    status: "Active",
  },
];

const EmployeePage = () => {
  const router = useRouter();
  return (
    <div className="space-y-6 ">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Employee Management
          </h1>
          <p className="text-sm text-muted-foreground">
            View and manage employee records and joining forms.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button variant="outline" onClick={generateJoiningFormPDF}>
            <Download className="mr-2 h-4 w-4" />
            Download Joining Form
          </Button>

          <Button
            onClick={() => router.push("/employee/form")}
            className="cursor-pointer bg-black hover:bg-black/85 text-white"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Employee
          </Button>
        </div>
      </div>

      {/* Employee Table */}
      <Card className="rounded-xl">
        <CardHeader className="pb-3">
          <CardTitle>Employees</CardTitle>
          <CardDescription>List of all registered employees</CardDescription>
        </CardHeader>

        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Designation</TableHead>
                <TableHead>Date of Joining</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {employees.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center text-muted-foreground py-6"
                  >
                    No employees found
                  </TableCell>
                </TableRow>
              ) : (
                employees.map((emp) => (
                  <TableRow key={emp.id}>
                    <TableCell className="font-medium">{emp.id}</TableCell>
                    <TableCell>{emp.name}</TableCell>
                    <TableCell>{emp.department}</TableCell>
                    <TableCell>{emp.designation}</TableCell>
                    <TableCell>{emp.doj}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        onClick={() => router.push(`/employee/${emp.id}`)}
                      >
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmployeePage;

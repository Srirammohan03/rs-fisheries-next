"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useState } from "react";

// UI Components
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

// Icons
import {
  Pencil,
  Trash,
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Building,
  CreditCard,
  FileText,
  Copy,
  Check,
  Briefcase,
  User,
  Wallet,
} from "lucide-react";

// Types
import { ApiResponse, Employee } from "@/lib/types";

/* ------------------------------------------------------------ */

const EmployeeDetailPage = () => {
  const { id } = useParams();
  const router = useRouter();

  const { data, isLoading, isError, error } = useQuery<ApiResponse<Employee>>({
    queryKey: ["employee", id],
    queryFn: async () => {
      const res = await axios.get(`/api/employee/${id}`, {
        withCredentials: true,
      });
      return res.data;
    },
  });

  if (isLoading) return <LoadingSkeleton />;
  if (isError) return <ErrorState message={error} />;

  const employee = data!.data;

  // Helper for initials
  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();

  return (
    <div className="p-6 md:p-8">
      <div className="space-y-6">
        {/* ---------------- Top Navigation Header ---------------- */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="rounded-full"
            >
              <ArrowLeft className="h-5 w-5 text-muted-foreground" />
            </Button>
            <div>
              <h1 className="text-xl font-bold tracking-tight">
                Employee Profile
              </h1>
              <p className="text-sm text-muted-foreground">
                Manage and view employee information
              </p>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* ---------------- LEFT COLUMN: Identity Sidebar ---------------- */}
          <div className="lg:col-span-4 space-y-6">
            <Card className="overflow-hidden border-none shadow-md">
              <div
                className="h-32 bg-gradient-to-r "
                style={{
                  backgroundImage: `url('/favicon.jpg')`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  backgroundRepeat: "no-repeat",
                }}
              ></div>
              <CardContent className="relative pt-0 pb-8 px-6 text-center">
                <div className="-mt-16 mb-4 flex justify-center">
                  <Avatar className="h-32 w-32 border-4 border-white shadow-lg">
                    <AvatarImage
                      src={employee.photo}
                      className="object-cover"
                    />
                    <AvatarFallback className="text-2xl bg-slate-100 text-slate-600">
                      {getInitials(employee.fullName)}
                    </AvatarFallback>
                  </Avatar>
                </div>

                <h2 className="text-2xl font-bold text-slate-900">
                  {employee.fullName}
                </h2>
                <div className="mt-1 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <span>{employee.designation}</span>
                  <span>•</span>
                  <span>{employee.department}</span>
                </div>

                <div className="mt-4 flex justify-center gap-2">
                  <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200">
                    Active
                  </Badge>
                  <Badge variant="outline">{employee.shiftType}</Badge>
                </div>

                <Separator className="my-6" />

                <div className="space-y-4 text-left">
                  <ContactItem
                    icon={Mail}
                    label="Email"
                    value={employee.email}
                    copyable
                  />
                  <ContactItem
                    icon={Phone}
                    label="Mobile"
                    value={employee.mobile}
                  />
                  <ContactItem
                    icon={MapPin}
                    label="Location"
                    value={employee.workLocation}
                  />
                  <ContactItem
                    icon={Calendar}
                    label="Joined"
                    value={new Date(employee.doj).toLocaleDateString("en-IN", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Quick Status Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                  Employment Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Employee ID</span>
                  <div className="flex items-center gap-2 bg-slate-100 px-2 py-1 rounded text-sm font-mono">
                    {employee.employeeId}
                    <CopyButton text={employee.employeeId} />
                  </div>
                </div>
                {/* <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Type</span>
                  <span className="text-sm text-muted-foreground">
                    Full-Time
                  </span>
                </div> */}
              </CardContent>
            </Card>
          </div>

          {/* ---------------- RIGHT COLUMN: Detailed Tabs ---------------- */}
          <div className="lg:col-span-8">
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-4 h-12">
                <TabsTrigger value="overview" className="gap-2">
                  <User className="h-4 w-4" /> Overview
                </TabsTrigger>
                <TabsTrigger value="financial" className="gap-2">
                  <Wallet className="h-4 w-4" /> Financials
                </TabsTrigger>
                <TabsTrigger value="documents" className="gap-2">
                  <FileText className="h-4 w-4" /> Documents
                </TabsTrigger>
              </TabsList>

              {/* TAB 1: Overview */}
              <TabsContent value="overview" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Personal Information</CardTitle>
                    <CardDescription>
                      Basic personal details and demographics.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-x-8 gap-y-6 md:grid-cols-2">
                    <DetailItem
                      label="Father's Name"
                      value={employee.fatherName}
                    />
                    <DetailItem
                      label="Date of Birth"
                      value={new Date(employee.dob).toLocaleDateString("en-IN")}
                    />
                    <DetailItem label="Gender" value={employee.gender} />
                    <DetailItem
                      label="Marital Status"
                      value={employee.maritalStatus}
                    />
                    <DetailItem
                      label="Nationality"
                      value={employee.nationality}
                    />
                    <DetailItem label="Alt Mobile" value={employee.altMobile} />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Addresses</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex gap-4 items-start">
                      <div className="mt-1 bg-blue-100 p-2 rounded-full text-blue-600">
                        <MapPin className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">
                          Current Address
                        </p>
                        <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                          {employee.currentAddress}
                        </p>
                      </div>
                    </div>
                    <Separator />
                    <div className="flex gap-4 items-start">
                      <div className="mt-1 bg-purple-100 p-2 rounded-full text-purple-600">
                        <Building className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">
                          Permanent Address
                        </p>
                        <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                          {employee.permanentAddress}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* TAB 2: Financials */}
              <TabsContent value="financial" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Cost to Company (CTC)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">₹ {employee.ctc}</div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Per Annum
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Gross Salary
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        ₹ {employee.grossSalary}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Monthly
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Briefcase className="h-5 w-5 text-muted-foreground" />
                      Bank Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-x-8 gap-y-6 md:grid-cols-2">
                    <DetailItem label="Bank Name" value={employee.bankName} />
                    <DetailItem label="Branch" value={employee.branchName} />
                    <DetailItem
                      label="Account Number"
                      value={employee.accountNumber}
                      isMono
                    />
                    <DetailItem
                      label="IFSC Code"
                      value={employee.ifsc}
                      isMono
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5 text-muted-foreground" />
                      Identity Proofs
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-x-8 gap-y-6 md:grid-cols-2">
                    <DetailItem
                      label="Aadhaar Number"
                      value={employee.aadhaar}
                      isMono
                    />
                    <DetailItem
                      label="PAN Number"
                      value={employee.pan}
                      isMono
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* TAB 3: Documents */}
              <TabsContent value="documents">
                <Card>
                  <CardHeader>
                    <CardTitle>Uploaded Documents</CardTitle>
                    <CardDescription>
                      Digital copies of employee proofs and photos.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      <DocumentPreview
                        title="Profile Photo"
                        src={employee.photo}
                        type="Image"
                      />
                      <DocumentPreview
                        title="Aadhaar Card"
                        src={employee.aadhaarProof}
                        type="PDF/Image"
                      />
                      <DocumentPreview
                        title="PAN Card"
                        src={employee.panProof}
                        type="PDF/Image"
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeDetailPage;

/* ------------------------------------------------------------ */
/* Helper Components for Cleaner Main File */

const ContactItem = ({
  icon: Icon,
  label,
  value,
  copyable = false,
}: {
  icon: any;
  label: string;
  value?: string;
  copyable?: boolean;
}) => {
  if (!value) return null;
  return (
    <div className="flex items-center gap-3 text-sm group">
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-50 text-slate-500">
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 overflow-hidden">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="flex items-center gap-2">
          <p className="font-medium truncate text-slate-900">{value}</p>
          {copyable && <CopyButton text={value} />}
        </div>
      </div>
    </div>
  );
};

const DetailItem = ({
  label,
  value,
  isMono = false,
}: {
  label: string;
  value?: string | number;
  isMono?: boolean;
}) => (
  <div className="space-y-1">
    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
      {label}
    </p>
    <p
      className={`text-base font-medium text-slate-900 ${
        isMono ? "font-mono" : ""
      }`}
    >
      {value || "—"}
    </p>
  </div>
);

const DocumentPreview = ({
  title,
  src,
  type,
}: {
  title: string;
  src: string;
  type: string;
}) => (
  <div className="group relative rounded-xl border bg-card text-card-foreground shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden">
    <div className="aspect-video w-full bg-slate-100 relative overflow-hidden">
      <img
        src={src}
        alt={title}
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
      />
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <Button variant="secondary" size="sm" className="h-8">
          View
        </Button>
      </div>
    </div>
    <div className="p-4">
      <h3 className="font-semibold text-sm">{title}</h3>
      <p className="text-xs text-muted-foreground mt-1">{type}</p>
    </div>
  </div>
);

const CopyButton = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="text-slate-400 hover:text-blue-600 transition-colors focus:outline-none"
      title="Copy to clipboard"
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
    </button>
  );
};

const LoadingSkeleton = () => (
  <div className="p-8 max-w-7xl mx-auto space-y-6">
    <div className="flex justify-between">
      <Skeleton className="h-8 w-32" />
      <div className="flex gap-2">
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-24" />
      </div>
    </div>
    <div className="grid grid-cols-12 gap-6">
      <div className="col-span-4">
        <Skeleton className="h-[400px] w-full rounded-xl" />
      </div>
      <div className="col-span-8 space-y-4">
        <Skeleton className="h-12 w-full rounded-lg" />
        <Skeleton className="h-[300px] w-full rounded-xl" />
      </div>
    </div>
  </div>
);

const ErrorState = (error: any) => {
  let message = null;
  if (axios.isAxiosError(error)) {
    message = error.response?.data?.message || "An unexpected error occurred.";
  } else {
    message = error.message || "An unexpected error occurred.";
  }
  return (
    <div className="h-[50vh] flex flex-col items-center justify-center gap-4 text-center">
      <div className="bg-red-50 p-4 rounded-full">
        <Trash className="h-8 w-8 text-red-500" />
      </div>
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Failed to load employee</h3>
        <p className="text-sm text-muted-foreground max-w-md">{message}</p>
      </div>
      <Button variant="outline" onClick={() => window.location.reload()}>
        Try Again
      </Button>
    </div>
  );
};

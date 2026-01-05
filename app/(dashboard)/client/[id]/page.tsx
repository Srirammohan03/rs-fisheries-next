"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import {
  ArrowLeft,
  Building2,
  CreditCard,
  History,
  Info,
  MapPin,
  Phone,
  Mail,
  Banknote,
  ExternalLink,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

// --- Page Component ---
const ClientViewPage = () => {
  const { id } = useParams();
  const router = useRouter();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["client", id],
    queryFn: async () => {
      const { data } = await axios.get(`/api/client/${id}`);
      return data.data;
    },
    enabled: !!id,
  });

  if (isLoading) return <LoadingSkeleton />;
  if (isError) return <ErrorState />;

  const client = data;

  // Formatting helpers
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(val);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight">
                {client.partyName}
              </h1>
              <Badge variant={client.isActive ? "default" : "secondary"}>
                {client.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              {client.partyGroup || "General Client"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/client/${id}/edit`)}
          >
            Edit Profile
          </Button>
          <Button>Create New Invoice</Button>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Current Balance"
          value={formatCurrency(client.openingBalance)}
          subText={client.balanceType}
          icon={
            client.balanceType === "PAYABLE" ? (
              <TrendingDown className="text-red-500" />
            ) : (
              <TrendingUp className="text-green-500" />
            )
          }
        />
        <StatCard
          title="Credit Limit"
          value={formatCurrency(client.creditLimit || 0)}
          subText="Maximum Allowed"
          icon={<CreditCard className="text-blue-500" />}
        />
        <StatCard
          title="GST Status"
          value={client.gstType}
          subText={client.gstin || "N/A"}
          icon={<ShieldCheck className="text-purple-500" />}
        />
        <StatCard
          title="Contact"
          value={client.phone}
          subText={client.email || "No email provided"}
          icon={<Phone className="text-orange-500" />}
        />
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full md:w-[400px] grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="banking">Banking</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Info className="h-5 w-5" /> Detailed Information
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-y-6">
                <DetailItem
                  label="Full Address"
                  value={client.billingAddress}
                  fullWidth
                  icon={<MapPin className="h-4 w-4" />}
                />
                <DetailItem label="State" value={client.state} />
                <DetailItem label="Reference No" value={client.referenceNo} />
                <DetailItem
                  label="Payment Terms"
                  value={client.paymentdetails || "Standard terms apply"}
                  fullWidth
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Contact Meta</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-secondary rounded-full">
                    <Mail className="h-4 w-4" />
                  </div>
                  <span className="text-sm truncate">
                    {client.email || "N/A"}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-secondary rounded-full">
                    <Phone className="h-4 w-4" />
                  </div>
                  <span className="text-sm">{client.phone}</span>
                </div>
                <Separator />
                <div className="text-xs text-muted-foreground">
                  Added on: {new Date(client.createdAt).toLocaleDateString()}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Banking Tab */}
        <TabsContent value="banking">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" /> Bank Account Details
              </CardTitle>
              <CardDescription>
                Primary bank information for settlements
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <DetailItem label="Bank Name" value={client.bankName} />
              <DetailItem label="Account Number" value={client.accountNumber} />
              <DetailItem label="IFSC Code" value={client.ifsc} />
              <DetailItem
                label="Branch Address"
                value={client.bankAddress}
                fullWidth
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab (Placeholder for relations) */}
        <TabsContent value="history">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <History className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No Recent Transactions</h3>
              <p className="text-muted-foreground max-w-sm">
                Transactions and loading history for {client.partyName} will
                appear here.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// --- Sub-components ---

function StatCard({
  title,
  value,
  subText,
  icon,
}: {
  title: string;
  value: string;
  subText: string;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between space-y-0 pb-2">
          <p className="text-sm font-medium">{title}</p>
          {icon}
        </div>
        <div>
          <div className="text-2xl font-bold">{value}</div>
          <p className="text-xs text-muted-foreground uppercase mt-1">
            {subText}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function DetailItem({
  label,
  value,
  fullWidth = false,
  icon,
}: {
  label: string;
  value: string | null | undefined;
  fullWidth?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div className={`${fullWidth ? "col-span-2" : "col-span-1"} space-y-1`}>
      <p className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
        {icon} {label}
      </p>
      <p className="text-sm font-medium leading-relaxed">{value || "—"}</p>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <Skeleton className="h-12 w-1/3" />
      <div className="grid grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
      <Skeleton className="h-[400px] w-full" />
    </div>
  );
}

function ErrorState() {
  return (
    <div className="h-screen flex flex-col items-center justify-center space-y-4">
      <h2 className="text-xl font-bold">Client not found</h2>
      <Button onClick={() => window.history.back()}>Go Back</Button>
    </div>
  );
}

export default ClientViewPage;

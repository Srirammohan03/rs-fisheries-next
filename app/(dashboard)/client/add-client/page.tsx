"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  BalanceType,
  ClientFormValues,
  clientSchema,
  GstType,
} from "../types/type";

const AddClientPage = () => {
  const router = useRouter();
  const queryClient = useQueryClient();

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      partyName: "",
      phone: "",
      gstType: GstType.UNREGISTERED,
      billingAddress: "",
      openingBalance: 0,
      balanceType: BalanceType.RECEIVABLE,
      isActive: true,
      partyGroup: "",
      email: "",
      gstin: "",
      state: "",
      referenceNo: "",
      accountNumber: "",
      ifsc: "",
      bankName: "",
      bankAddress: "",
      paymentdetails: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: ClientFormValues) => {
      const formData = new FormData();

      Object.entries(values).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== "") {
          formData.append(key, value.toString());
        }
      });

      const response = await axios.post("/api/client", formData, {
        withCredentials: true,
      });
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Client created successfully");
      reset();
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      router.push("/client");
    },
    onError: (error: any) => {
      const msg = axios.isAxiosError(error)
        ? error.response?.data?.message || "Failed to create client"
        : error.message || "Failed to create client";
      toast.error(msg);
    },
  });

  const onSubmit = (data: ClientFormValues) => {
    mutation.mutate(data);
  };

  const ErrorMsg = ({ error }: { error?: { message?: string } }) => {
    if (!error?.message) return null;
    return <p className="text-xs text-red-500 mt-1">{error.message}</p>;
  };

  const RequiredStar = () => <span className="text-red-500 ml-1">*</span>;

  return (
    <div className="mx-auto py-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center justify-center gap-4 mb-3">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Add New Client</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* --- Basic Party Info --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 border rounded-lg shadow-sm bg-card">
          <h2 className="text-lg font-semibold md:col-span-2 border-b pb-2 mb-2">
            Basic Information
          </h2>

          {/* Party Name */}
          <div className="space-y-2">
            <Label htmlFor="partyName">
              Party Name <RequiredStar />
            </Label>
            <Input
              id="partyName"
              placeholder="Enter party name"
              {...register("partyName")}
            />
            <ErrorMsg error={errors.partyName} />
          </div>

          {/* Party Group */}
          <div className="space-y-2">
            <Label htmlFor="partyGroup">Party Group</Label>
            <Input
              id="partyGroup"
              placeholder="e.g. Wholesaler"
              {...register("partyGroup")}
            />
            <ErrorMsg error={errors.partyGroup} />
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="phone">
              Phone Number <RequiredStar />
            </Label>
            <Input
              id="phone"
              type="tel"
              placeholder="9876543210"
              maxLength={10}
              {...register("phone")}
            />
            <ErrorMsg error={errors.phone} />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="client@example.com"
              {...register("email")}
            />
            <ErrorMsg error={errors.email} />
          </div>
        </div>

        {/* --- GST & Address --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 border rounded-lg shadow-sm bg-card">
          <h2 className="text-lg font-semibold md:col-span-2 border-b pb-2 mb-2">
            Tax & Address
          </h2>

          {/* GST Type (Select using Controller) */}
          <div className="space-y-2">
            <Label htmlFor="gstType">
              GST Type <RequiredStar />
            </Label>
            <Controller
              name="gstType"
              control={control}
              render={({ field }) => (
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select GST Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={GstType.UNREGISTERED}>
                      Unregistered
                    </SelectItem>
                    <SelectItem value={GstType.REGISTERED}>
                      Registered
                    </SelectItem>
                    <SelectItem value={GstType.CONSUMER}>Consumer</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            <ErrorMsg error={errors.gstType} />
          </div>

          {/* GSTIN */}
          <div className="space-y-2">
            <Label htmlFor="gstin">GSTIN</Label>
            <Input
              id="gstin"
              placeholder="22AAAAA0000A1Z5"
              {...register("gstin")}
              className="uppercase"
            />
            <ErrorMsg error={errors.gstin} />
          </div>

          {/* State */}
          <div className="space-y-2">
            <Label htmlFor="state">State</Label>
            <Input id="state" placeholder="State Name" {...register("state")} />
            <ErrorMsg error={errors.state} />
          </div>

          {/* Billing Address (Full width) */}
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="billingAddress">
              Billing Address <RequiredStar />
            </Label>
            <Textarea
              id="billingAddress"
              placeholder="Full address here..."
              className="resize-none h-24"
              {...register("billingAddress")}
            />
            <ErrorMsg error={errors.billingAddress} />
          </div>
        </div>

        {/* --- Credit & Balance --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 border rounded-lg shadow-sm bg-card">
          <h2 className="text-lg font-semibold md:col-span-3 border-b pb-2 mb-2">
            Financial Details
          </h2>

          {/* Opening Balance */}
          <div className="space-y-2">
            <Label htmlFor="openingBalance">
              Opening Balance <RequiredStar />
            </Label>
            <Input
              id="openingBalance"
              type="number"
              step="0.01"
              {...register("openingBalance")}
            />
            <ErrorMsg error={errors.openingBalance} />
          </div>

          {/* Balance Type (Select) */}
          <div className="space-y-2">
            <Label htmlFor="balanceType">
              Balance Type <RequiredStar />
            </Label>
            <Controller
              name="balanceType"
              control={control}
              render={({ field }) => (
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={BalanceType.RECEIVABLE}>
                      Receivable
                    </SelectItem>
                    <SelectItem value={BalanceType.PAYABLE}>Payable</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            <ErrorMsg error={errors.balanceType} />
          </div>

          {/* Credit Limit */}
          <div className="space-y-2">
            <Label htmlFor="creditLimit">Credit Limit</Label>
            <Input
              id="creditLimit"
              type="number"
              step="0.01"
              placeholder="0.00"
              {...register("creditLimit")}
            />
            <ErrorMsg error={errors.creditLimit} />
          </div>

          {/* Reference No */}
          <div className="space-y-2">
            <Label htmlFor="referenceNo">Reference No</Label>
            <Input
              id="referenceNo"
              placeholder="Ref #"
              {...register("referenceNo")}
            />
            <ErrorMsg error={errors.referenceNo} />
          </div>
        </div>

        {/* --- Bank Details --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 border rounded-lg shadow-sm bg-card">
          <h2 className="text-lg font-semibold md:col-span-2 border-b pb-2 mb-2">
            Bank Details
          </h2>

          {/* Account Number */}
          <div className="space-y-2">
            <Label htmlFor="accountNumber">
              Account Number
              <RequiredStar />
            </Label>

            <Input
              id="accountNumber"
              type="text"
              placeholder="Bank Account No"
              {...register("accountNumber")}
            />
            <ErrorMsg error={errors.accountNumber} />
          </div>

          {/* IFSC */}
          <div className="space-y-2">
            <Label htmlFor="ifsc">IFSC Code</Label>
            <Input
              id="ifsc"
              placeholder="SBIN0123456"
              {...register("ifsc")}
              className="uppercase"
              maxLength={11}
            />
            <ErrorMsg error={errors.ifsc} />
          </div>

          {/* Bank Name */}
          <div className="space-y-2">
            <Label htmlFor="bankName">Bank Name</Label>
            <Input
              id="bankName"
              placeholder="e.g. SBI"
              {...register("bankName")}
            />
            <ErrorMsg error={errors.bankName} />
          </div>

          {/* Bank Address */}
          <div className="space-y-2">
            <Label htmlFor="bankAddress">Bank Branch/Address</Label>
            <Input
              id="bankAddress"
              placeholder="Branch location"
              {...register("bankAddress")}
            />
            <ErrorMsg error={errors.bankAddress} />
          </div>

          {/* Payment Details */}
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="paymentdetails">Additional Payment Details</Label>
            <Textarea
              id="paymentdetails"
              placeholder="UPI ID or other notes..."
              className="resize-none"
              {...register("paymentdetails")}
            />
            <ErrorMsg error={errors.paymentdetails} />
          </div>
        </div>

        {/* --- Status (Switch) --- */}
        <div className="flex items-center space-x-2 p-6 border rounded-lg shadow-sm bg-card">
          <Controller
            name="isActive"
            control={control}
            render={({ field }) => (
              <Switch
                id="isActive"
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            )}
          />
          <Label htmlFor="isActive" className="cursor-pointer">
            Is Active Client?
          </Label>
        </div>

        {/* --- Submit Action --- */}
        <div className="flex justify-end gap-4">
          <Button variant="outline" type="button" onClick={() => reset()}>
            Reset
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {mutation.isPending ? "Creating..." : "Create Client"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default AddClientPage;

"use client";

import React, { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Loader2, ArrowLeft } from "lucide-react";
import { useRouter, useParams } from "next/navigation";

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
} from "../../types/type";

export default function EditClientPage() {
  const { id } = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [formReady, setFormReady] = React.useState(false);

  const { data: clientData, isLoading: isFetching } = useQuery({
    queryKey: ["client", id],
    queryFn: async () => {
      const { data } = await axios.get(`/api/client/${id}`);
      return data.data;
    },
    enabled: !!id,
  });

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(clientSchema),
  });

  useEffect(() => {
    if (!clientData) return;
    if (clientData) {
      reset({
        ...clientData,
        partyGroup: clientData.partyGroup || "",
        email: clientData.email || "",
        gstin: clientData.gstin || "",
        state: clientData.state || "",
        referenceNo: clientData.referenceNo || "",
        accountNumber: clientData.accountNumber || "",
        ifsc: clientData.ifsc || "",
        bankName: clientData.bankName || "",
        bankAddress: clientData.bankAddress || "",
        paymentdetails: clientData.paymentdetails || "",
        gstType: clientData.gstType ?? GstType.REGISTERED,
        balanceType: clientData.balanceType ?? BalanceType.RECEIVABLE,
      });
    }
    setFormReady(true);
  }, [clientData, reset]);

  const mutation = useMutation({
    mutationFn: async (values: ClientFormValues) => {
      const formData = new FormData();

      Object.entries(values).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== "")
          formData.append(key, String(value));
      });
      const { data } = await axios.patch(`/api/client/${id}`, formData);
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Client updated successfully");
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["client", id] });
      router.push("/client");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Update failed");
    },
  });

  if (isFetching || !formReady)
    return <div className="p-10 text-center">Loading client data...</div>;
  const RequiredStar = () => (
    <span className="text-red-500 ml-1">
      <RequiredStar />
    </span>
  );

  return (
    <div className="mx-auto py-10">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">
          Edit Party: {clientData?.partyName}
        </h1>
      </div>

      <form
        onSubmit={handleSubmit((data) => mutation.mutate(data))}
        className="space-y-8"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 border rounded-lg bg-card">
          <h2 className="text-lg font-semibold md:col-span-2 border-b pb-2">
            Basic Info
          </h2>

          <div className="space-y-2">
            <Label>
              Party Name <RequiredStar />
            </Label>
            <Input {...register("partyName")} />
            {errors.partyName && (
              <p className="text-xs text-red-500">{errors.partyName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Party Group</Label>
            <Input {...register("partyGroup")} />
          </div>

          <div className="space-y-2">
            <Label>
              Phone <RequiredStar />
            </Label>
            <Input {...register("phone")} maxLength={10} />
            {errors.phone && (
              <p className="text-xs text-red-500">{errors.phone.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Email</Label>
            <Input {...register("email")} type="email" />
            {errors.email && (
              <p className="text-xs text-red-500">{errors.email.message}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 border rounded-lg bg-card">
          <h2 className="text-lg font-semibold md:col-span-2 border-b pb-2">
            Tax & Address
          </h2>

          <div className="space-y-2">
            <Label>
              GST Type <RequiredStar />
            </Label>
            <Controller
              name="gstType"
              control={control}
              render={({ field }) => {
                return (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="REGISTERED">Registered</SelectItem>
                      <SelectItem value="UNREGISTERED">Unregistered</SelectItem>
                      <SelectItem value="CONSUMER">Consumer</SelectItem>
                    </SelectContent>
                  </Select>
                );
              }}
            />
            {errors.gstType && (
              <p className="text-xs text-red-500">{errors.gstType.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>GSTIN</Label>
            <Input {...register("gstin")} className="uppercase" />
            {errors.gstin && (
              <p className="text-xs text-red-500">{errors.gstin.message}</p>
            )}
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>
              Billing Address <RequiredStar />
            </Label>
            <Textarea {...register("billingAddress")} />
            {errors.billingAddress && (
              <p className="text-xs text-red-500">
                {errors.billingAddress.message}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 border rounded-lg bg-card">
          <h2 className="text-lg font-semibold md:col-span-3 border-b pb-2">
            Financials
          </h2>

          <div className="space-y-2">
            <Label>Opening Balance</Label>
            <Input type="number" step="0.01" {...register("openingBalance")} />
            {errors.openingBalance && (
              <p className="text-xs text-red-500">
                {errors.openingBalance.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Balance Type</Label>
            <Controller
              name="balanceType"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RECEIVABLE">Receivable</SelectItem>
                    <SelectItem value="PAYABLE">Payable</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.balanceType && (
              <p className="text-xs text-red-500">
                {errors.balanceType.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Credit Limit</Label>
            <Input type="number" {...register("creditLimit")} />
            {errors.creditLimit && (
              <p className="text-xs text-red-500">
                {errors.creditLimit.message}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 border rounded-lg bg-card">
          <h2 className="text-lg font-semibold md:col-span-2 border-b pb-2">
            Bank Details
          </h2>
          <div className="space-y-2">
            <Label>Account Number</Label>
            <Input {...register("accountNumber")} />
            {errors.accountNumber && (
              <p className="text-xs text-red-500">
                {errors.accountNumber.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label>IFSC</Label>
            <Input {...register("ifsc")} className="uppercase" />
            {errors.ifsc && (
              <p className="text-xs text-red-500">{errors.ifsc.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Bank Name</Label>
            <Input {...register("bankName")} />
            {errors.bankName && (
              <p className="text-xs text-red-500">{errors.bankName.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Bank Address</Label>
            <Input {...register("bankAddress")} />
            {errors.bankAddress && (
              <p className="text-xs text-red-500">
                {errors.bankAddress.message}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between p-6 border rounded-lg bg-card">
          <div className="flex items-center gap-2">
            <Controller
              name="isActive"
              control={control}
              render={({ field }) => (
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
            <Label>Active Status</Label>
          </div>

          <div className="flex gap-4">
            <Button
              variant="outline"
              type="button"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save Changes
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

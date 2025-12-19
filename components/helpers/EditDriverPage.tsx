"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Loader2, Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/jpg"];

const editSchema = z.object({
  name: z.string().min(1, "Required"),

  phone: z
    .string()
    .min(1, "Phone number is required")
    .regex(/^[6789]\d{9}$/, "Invalid phone number format"),

  licenseNumber: z
    .string()
    .min(1, "License number is required")
    .regex(
      /^[A-Z]{2}\s?\d{2}\s?\d{4}\s?\d{7}$/,
      "Invalid license number format (e.g., MH 12 2010 0123456)"
    ),

  address: z.string().min(1, "Address is required"),

  age: z
    .string()
    .regex(/^(1[89]|[2-9]\d|100)$/, "Age must be between 18 and 100"),

  aadharNumber: z
    .string()
    .regex(/^[2-9]{1}[0-9]{11}$/, "Invalid Aadhar number"),

  identityProof: z
    .instanceof(File)
    .optional()
    .refine(
      (file) => !file || file.size <= MAX_FILE_SIZE,
      "Max file size is 5MB"
    )
    .refine(
      (file) => !file || ACCEPTED_IMAGE_TYPES.includes(file.type),
      "Only JPG / PNG images are allowed"
    ),
});

type EditForm = z.infer<typeof editSchema>;

type DriverData = {
  id: string;
  name: string;
  phone: string;
  licenseNumber: string;
  address: string;
  age: number;
  aadharNumber: string;
  identityProofType?: string | null;
  identityProofName?: string | null;
};

export default function EditDriverPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const queryClient = useQueryClient();

  const [currentProofUrl, setCurrentProofUrl] = useState<string | null>(null);
  const [newProofPreview, setNewProofPreview] = useState<string | null>(null);
  const [newFileName, setNewFileName] = useState<string | null>(null);

  const {
    data: driver,
    isLoading: loadingDriver,
    isError,
  } = useQuery<DriverData>({
    queryKey: ["driver", id],
    queryFn: async () => {
      const { data: res } = await axios.get(`/api/driver/${id}`);
      return res.data;
    },
    enabled: !!id,
  });

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<EditForm>({
    resolver: zodResolver(editSchema),
  });

  // Pre-fill form when driver data loads
  useEffect(() => {
    if (driver) {
      reset({
        name: driver.name,
        phone: driver.phone,
        licenseNumber: driver.licenseNumber,
        address: driver.address,
        age: String(driver.age),
        aadharNumber: driver.aadharNumber,
      });
    }
  }, [driver, reset]);

  // Fetch current identity proof preview
  useEffect(() => {
    if (!driver?.identityProofType || !id) {
      setCurrentProofUrl(null);
      return;
    }

    axios
      .get(`/api/driver/proof?driverId=${id}`, { responseType: "blob" })
      .then((res) => {
        const url = URL.createObjectURL(res.data);
        setCurrentProofUrl(url);
      })
      .catch(() => {
        setCurrentProofUrl(null);
      });

    return () => {
      if (currentProofUrl) URL.revokeObjectURL(currentProofUrl);
    };
  }, [driver, id]);

  // Cleanup preview URLs
  useEffect(() => {
    return () => {
      if (currentProofUrl) URL.revokeObjectURL(currentProofUrl);
      if (newProofPreview) URL.revokeObjectURL(newProofPreview);
    };
  }, [currentProofUrl, newProofPreview]);

  const updateMutation = useMutation({
    mutationFn: async (payload: FormData) => {
      const { data } = await axios.patch(`/api/driver/${id}`, payload, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return data;
    },
    onSuccess: (data) => {
      toast.success(data?.message ?? "Driver updated successfully");
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
      queryClient.invalidateQueries({ queryKey: ["driver", id] });
      router.push("/drivers"); // Adjust path if your list page is different
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to update driver");
    },
  });

  const onSubmit = (data: EditForm) => {
    const formData = new FormData();

    formData.append("name", data.name);
    formData.append("phone", data.phone);
    formData.append("licenseNumber", data.licenseNumber);
    formData.append("address", data.address);
    formData.append("age", data.age);
    formData.append("aadharNumber", data.aadharNumber);

    if (data.identityProof) {
      formData.append("identityProof", data.identityProof);
    }

    updateMutation.mutate(formData);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setValue("identityProof", file, { shouldValidate: true });
      setNewFileName(file.name);
      if (newProofPreview) URL.revokeObjectURL(newProofPreview);
      setNewProofPreview(URL.createObjectURL(file));
    } else {
      setValue("identityProof", undefined);
      setNewFileName(null);
      if (newProofPreview) {
        URL.revokeObjectURL(newProofPreview);
        setNewProofPreview(null);
      }
    }
  };

  if (loadingDriver) {
    return (
      <div className="py-20 text-center text-slate-500">
        Loading driver details...
      </div>
    );
  }

  if (isError || !driver) {
    return (
      <div className="py-20 text-center text-red-600">
        Driver not found or failed to load.
      </div>
    );
  }

  const previewUrl = newProofPreview || currentProofUrl;
  const previewName = newFileName || driver.identityProofName || "Unknown";

  return (
    <div className="container max-w-3xl mx-auto py-10">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">
            Edit Driver - {driver.name}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input {...register("name")} />
                {errors.name && (
                  <p className="text-sm text-red-600">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Phone</Label>
                <Input {...register("phone")} />
                {errors.phone && (
                  <p className="text-sm text-red-600">{errors.phone.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>License Number</Label>
                <Input {...register("licenseNumber")} />
                {errors.licenseNumber && (
                  <p className="text-sm text-red-600">
                    {errors.licenseNumber.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Age</Label>
                <Input {...register("age")} />
                {errors.age && (
                  <p className="text-sm text-red-600">{errors.age.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Aadhar Number</Label>
                <Input {...register("aadharNumber")} />
                {errors.aadharNumber && (
                  <p className="text-sm text-red-600">
                    {errors.aadharNumber.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Address</Label>
              <Input {...register("address")} />
              {errors.address && (
                <p className="text-sm text-red-600">{errors.address.message}</p>
              )}
            </div>

            {/* Identity Proof Section */}
            <div className="space-y-4 border-t pt-6">
              <Label>Identity Proof</Label>

              {previewUrl ? (
                <div className="space-y-4">
                  <img
                    src={previewUrl}
                    alt="Identity Proof Preview"
                    className="max-w-full max-h-96 rounded-lg object-contain shadow-md"
                  />
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-slate-600">
                      {newFileName ? "New file selected" : "Current file"}:{" "}
                      {previewName}
                    </p>
                    {!newProofPreview && currentProofUrl && (
                      <Button variant="secondary" size="sm" asChild>
                        <a
                          href={currentProofUrl}
                          download={
                            driver.identityProofName || "identity-proof.jpg"
                          }
                          className="flex items-center gap-2"
                        >
                          <Download className="h-4 w-4" />
                          Download Current
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-500 italic">
                  No identity proof uploaded yet
                </p>
              )}

              <div className="space-y-2">
                <Label htmlFor="newProof">
                  Replace with new image (optional)
                </Label>
                <Input
                  id="newProof"
                  type="file"
                  accept="image/png,image/jpeg,image/jpg"
                  onChange={handleFileChange}
                />
                {errors.identityProof && (
                  <p className="text-sm text-red-600">
                    {(errors.identityProof as any)?.message}
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-4 pt-6">
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Update Driver
              </Button>
              <Button variant="outline" asChild>
                <Link href="/drivers">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

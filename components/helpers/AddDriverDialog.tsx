"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { DriverRow } from "./DriverTable";

const schema = z.object({
  name: z.string().min(1, "Required"),
  phone: z
    .string()
    .min(1, "Phone number is required")
    .regex(
      /^[6789]\d{9}$/,
      "Invalid phone number format or Must be 10 digits."
    ),
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
    .regex(/^[2-9]{1}[0-9]{11}$/, "Invalid Aadhar number format"),
});

type DriverForm = z.infer<typeof schema>;

type DriverDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driver?: DriverRow | null;
};

export function DriverDialog({
  open,
  onOpenChange,
  driver,
}: DriverDialogProps) {
  const isEdit = !!driver;
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<DriverForm>({
    resolver: zodResolver(schema),
  });

  // Aadhar Proof states
  const [selectedAadharFile, setSelectedAadharFile] = useState<File | null>(
    null
  );
  const [previewAadharUrl, setPreviewAadharUrl] = useState<string | null>(null);
  const [isRemovingAadhar, setIsRemovingAadhar] = useState(false);

  // License Proof states
  const [selectedLicenseFile, setSelectedLicenseFile] = useState<File | null>(
    null
  );
  const [previewLicenseUrl, setPreviewLicenseUrl] = useState<string | null>(
    null
  );
  const [isRemovingLicense, setIsRemovingLicense] = useState(false);

  // Reset form and file states when driver changes (edit → add or different driver)
  useEffect(() => {
    if (driver) {
      reset({
        name: driver.name,
        phone: driver.phone,
        licenseNumber: driver.licenseNumber,
        address: driver.address,
        age: driver.age.toString(),
        aadharNumber: driver.aadharNumber,
      });

      // Reset file states
      setSelectedAadharFile(null);
      setPreviewAadharUrl(null);
      setIsRemovingAadhar(false);

      setSelectedLicenseFile(null);
      setPreviewLicenseUrl(null);
      setIsRemovingLicense(false);
    } else {
      reset();
      setSelectedAadharFile(null);
      setPreviewAadharUrl(null);
      setIsRemovingAadhar(false);

      setSelectedLicenseFile(null);
      setPreviewLicenseUrl(null);
      setIsRemovingLicense(false);
    }
  }, [driver, reset]);

  useEffect(() => {
    if (selectedAadharFile && selectedAadharFile.type.startsWith("image/")) {
      const url = URL.createObjectURL(selectedAadharFile);
      setPreviewAadharUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewAadharUrl(null);
    }
  }, [selectedAadharFile]);

  useEffect(() => {
    if (selectedLicenseFile && selectedLicenseFile.type.startsWith("image/")) {
      const url = URL.createObjectURL(selectedLicenseFile);
      setPreviewLicenseUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewLicenseUrl(null);
    }
  }, [selectedLicenseFile]);

  const mutation = useMutation({
    mutationFn: (formData: FormData) => {
      if (isEdit) {
        return axios.patch("/api/driver", formData);
      }
      return axios.post("/api/driver", formData);
    },
    onSuccess: (res: any) => {
      toast.success(
        isEdit
          ? "Driver updated successfully"
          : res.data?.message || "Driver added successfully"
      );
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Operation failed");
    },
  });

  const onSubmit = (data: DriverForm) => {
    const fd = new FormData();
    fd.append("name", data.name);
    fd.append("phone", data.phone);
    fd.append("licenseNumber", data.licenseNumber);
    fd.append("address", data.address);
    fd.append("age", data.age);
    fd.append("aadharNumber", data.aadharNumber);

    if (selectedAadharFile) {
      fd.append("aadharProof", selectedAadharFile);
    }
    if (selectedLicenseFile) {
      fd.append("licenseProof", selectedLicenseFile);
    }

    if (isEdit) {
      fd.append("id", driver!.id);
      if (isRemovingAadhar) {
        fd.append("removeAadharProof", "true");
      }
      if (isRemovingLicense) {
        fd.append("removeLicenseProof", "true");
      }
    }

    mutation.mutate(fd);
  };

  const fields: { label: string; name: keyof DriverForm }[] = [
    { label: "Name", name: "name" },
    { label: "Phone", name: "phone" },
    { label: "License Number", name: "licenseNumber" },
    { label: "Address", name: "address" },
    { label: "Age", name: "age" },
    { label: "Aadhar Number", name: "aadharNumber" },
  ];

  // Helper calculations for Aadhar
  const hasCurrentAadhar =
    !!selectedAadharFile || (!isRemovingAadhar && !!driver?.aadharProof);

  const isAadharPdf =
    selectedAadharFile?.type === "application/pdf" ||
    (!isRemovingAadhar && driver?.aadharProof?.toLowerCase().endsWith(".pdf"));

  // Helper calculations for License
  const hasCurrentLicense =
    !!selectedLicenseFile || (!isRemovingLicense && !!driver?.licenseProof);

  const isLicensePdf =
    selectedLicenseFile?.type === "application/pdf" ||
    (!isRemovingLicense &&
      driver?.licenseProof?.toLowerCase().endsWith(".pdf"));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Driver" : "Add Driver"}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4 overflow-y-auto max-h-[70vh] p-4"
        >
          {fields.map(({ label, name }) => (
            <div key={name} className="space-y-1">
              <Label>{label}</Label>
              <Input {...register(name)} />
              {errors[name] && (
                <p className="text-red-600 text-sm">
                  {errors[name]?.message?.toString()}
                </p>
              )}
            </div>
          ))}

          {/* Aadhar Proof Upload */}
          <div className="space-y-2">
            <Label>Aadhar Proof (optional - JPG, PNG, WEBP, PDF ≤ 5MB)</Label>
            <Input
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                if (file && file.size > 5 * 1024 * 1024) {
                  toast.error("File size must be under 5MB");
                  e.target.value = "";
                  return;
                }
                setSelectedAadharFile(file);
                setIsRemovingAadhar(false);
              }}
            />
          </div>

          {/* Aadhar Preview & Remove */}
          {hasCurrentAadhar && (
            <div className="space-y-3">
              <Label>Current Aadhar Proof</Label>
              {previewAadharUrl ? (
                <img
                  src={previewAadharUrl}
                  alt="Aadhar proof preview"
                  className="max-h-72 rounded-lg border object-contain"
                />
              ) : isAadharPdf ? (
                <div className="p-4 border rounded-lg bg-slate-50 flex items-center justify-between">
                  <span className="font-medium">
                    {selectedAadharFile?.name || "Aadhar Proof PDF"}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={() => {
                      const url = selectedAadharFile
                        ? URL.createObjectURL(selectedAadharFile)
                        : driver?.aadharProof;

                      if (url) window.open(url, "_blank");
                    }}
                  >
                    View PDF
                  </Button>
                </div>
              ) : (
                !previewAadharUrl &&
                !isAadharPdf &&
                driver?.aadharProof &&
                !isRemovingAadhar && (
                  <img
                    src={driver.aadharProof}
                    alt="Current Aadhar proof"
                    className="max-h-72 rounded-lg border object-contain"
                  />
                )
              )}

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    setSelectedAadharFile(null);
                    setPreviewAadharUrl(null);
                    setIsRemovingAadhar(true);
                  }}
                >
                  {isEdit ? "Remove Aadhar Proof" : "Clear Aadhar File"}
                </Button>
                {isRemovingAadhar && isEdit && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsRemovingAadhar(false)}
                  >
                    Cancel Remove
                  </Button>
                )}
              </div>
              {isRemovingAadhar && isEdit && (
                <p className="text-sm text-red-600">
                  Aadhar proof will be removed on save.
                </p>
              )}
            </div>
          )}

          {/* License Proof Upload */}
          <div className="space-y-2">
            <Label>License Proof (optional - JPG, PNG, WEBP, PDF ≤ 5MB)</Label>
            <Input
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                if (file && file.size > 5 * 1024 * 1024) {
                  toast.error("File size must be under 5MB");
                  e.target.value = "";
                  return;
                }
                setSelectedLicenseFile(file);
                setIsRemovingLicense(false);
              }}
            />
          </div>

          {/* License Preview & Remove */}
          {hasCurrentLicense && (
            <div className="space-y-3">
              <Label>Current License Proof</Label>
              {previewLicenseUrl ? (
                <img
                  src={previewLicenseUrl}
                  alt="License proof preview"
                  className="max-h-72 rounded-lg border object-contain"
                />
              ) : isLicensePdf ? (
                <div className="p-4 border rounded-lg bg-slate-50 flex items-center justify-between">
                  <span className="font-medium">
                    {selectedLicenseFile?.name || "License Proof PDF"}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={() => {
                      const url = selectedLicenseFile
                        ? URL.createObjectURL(selectedLicenseFile)
                        : driver?.licenseProof;

                      if (url) window.open(url, "_blank");
                    }}
                  >
                    View PDF
                  </Button>
                </div>
              ) : (
                !previewLicenseUrl &&
                !isLicensePdf &&
                driver?.licenseProof &&
                !isRemovingLicense && (
                  <img
                    src={driver.licenseProof}
                    alt="Current License proof"
                    className="max-h-72 rounded-lg border object-contain"
                  />
                )
              )}

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    setSelectedLicenseFile(null);
                    setPreviewLicenseUrl(null);
                    setIsRemovingLicense(true);
                  }}
                >
                  {isEdit ? "Remove License Proof" : "Clear License File"}
                </Button>
                {isRemovingLicense && isEdit && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsRemovingLicense(false)}
                  >
                    Cancel Remove
                  </Button>
                )}
              </div>
              {isRemovingLicense && isEdit && (
                <p className="text-sm text-red-600">
                  License proof will be removed on save.
                </p>
              )}
            </div>
          )}

          <Button
            className="w-full"
            type="submit"
            disabled={mutation.isPending}
          >
            {mutation.isPending && (
              <Loader2 className="animate-spin mr-2 h-4 w-4" />
            )}
            {isEdit ? "Update Driver" : "Add Driver"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

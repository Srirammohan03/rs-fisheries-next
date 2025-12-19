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

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

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
      setSelectedFile(null);
      setPreviewUrl(null);
      setIsRemoving(false);
    } else {
      reset();
      setSelectedFile(null);
      setPreviewUrl(null);
      setIsRemoving(false);
    }
  }, [driver, reset]);

  useEffect(() => {
    if (selectedFile && selectedFile.type.startsWith("image/")) {
      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl(null);
    }
  }, [selectedFile]);

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

    if (selectedFile) {
      fd.append("identityProof", selectedFile);
    }

    if (isEdit) {
      fd.append("id", driver!.id);
      if (isRemoving) {
        fd.append("removeIdentityProof", "true");
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

  const hasCurrentFile = selectedFile || (!isRemoving && driver?.identityProof);
  const effectiveUrl =
    previewUrl || (!isRemoving ? driver?.identityProof ?? null : null);
  const effectiveIsPdf =
    (selectedFile && selectedFile.type === "application/pdf") ||
    (!isRemoving && driver?.identityProof?.toLowerCase().endsWith(".pdf"));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Driver" : "Add Driver"}</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4 overflow-y-auto max-h-[70vh] pb-4"
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

          {/* File Upload */}
          <div className="space-y-2">
            <Label>Identity Proof (optional - JPG, PNG, WEBP, PDF ≤ 5MB)</Label>
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
                setSelectedFile(file);
                setIsRemoving(false);
              }}
            />
          </div>

          {/* Preview & Remove */}
          {hasCurrentFile && (
            <div className="space-y-3">
              <Label>Current Identity Proof</Label>

              {effectiveUrl ? (
                <img
                  src={effectiveUrl}
                  alt="Identity proof"
                  className="max-h-72 rounded-lg border object-contain"
                />
              ) : effectiveIsPdf ? (
                <div className="p-4 border rounded-lg bg-slate-50 flex items-center justify-between">
                  <span className="font-medium">
                    {selectedFile?.name || "Uploaded PDF"}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={() => {
                      if (selectedFile) {
                        window.open(
                          URL.createObjectURL(selectedFile),
                          "_blank"
                        );
                      } else if (driver?.identityProof) {
                        window.open(driver.identityProof, "_blank");
                      }
                    }}
                  >
                    View PDF
                  </Button>
                </div>
              ) : null}

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    setSelectedFile(null);
                    setPreviewUrl(null);
                    setIsRemoving(true);
                  }}
                >
                  {isEdit ? "Remove File" : "Clear File"}
                </Button>
                {isRemoving && isEdit && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsRemoving(false)}
                  >
                    Cancel Remove
                  </Button>
                )}
              </div>

              {isRemoving && isEdit && (
                <p className="text-sm text-red-600">
                  Identity proof will be removed on save.
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

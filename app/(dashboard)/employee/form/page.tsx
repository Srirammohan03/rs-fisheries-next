"use client";

import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { joiningFormSchema, JoiningFormValues } from "@/lib/schema";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { useRouter } from "next/navigation";

export default function JoiningFormPage() {
  const router = useRouter();
  const passportRef = useRef<HTMLInputElement>(null);
  const aadhaarRef = useRef<HTMLInputElement>(null);
  const panRef = useRef<HTMLInputElement>(null);

  const [passportPreview, setPassportPreview] = useState<string | null>(null);
  const [aadhaarPreview, setAadhaarPreview] = useState<string | null>(null);
  const [panPreview, setPanPreview] = useState<string | null>(null);

  const form = useForm<JoiningFormValues>({
    resolver: zodResolver(joiningFormSchema),
    defaultValues: {
      doj: "",
      department: "",
      designation: "",

      basicSalary: "",
      hra: "",
      conveyanceAllowance: "",
      specialAllowance: "",
      grossSalary: "",
      ctc: "",

      workLocation: "",
      shiftType: "",

      fullName: "",
      fatherName: "",
      dob: "",
      gender: undefined as any,

      aadhaar: "",
      pan: "",
      mobile: "",
      altMobile: "",
      email: "",

      maritalStatus: undefined,
      nationality: "",

      currentAddress: "",
      permanentAddress: "",

      bankName: "",
      branchName: "",
      accountNumber: "",
      ifsc: "",

      passportPhoto: undefined,
      aadhaarImage: undefined,
      panImage: undefined,
    },
  });

  useEffect(() => {
    return () => {
      if (passportPreview) URL.revokeObjectURL(passportPreview);
      if (aadhaarPreview) URL.revokeObjectURL(aadhaarPreview);
      if (panPreview) URL.revokeObjectURL(panPreview);
    };
  }, [passportPreview, aadhaarPreview, panPreview]);

  const addMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await axios.post("/api/employee", formData, {
        withCredentials: true,
      });
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Employee added successfully");
      form.reset();
      setPassportPreview(null);
      setAadhaarPreview(null);
      setPanPreview(null);
      router.push("/employee");
    },
    onError: (error: any) => {
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.message || "Something went wrong");
      } else {
        toast.error(error.message || "Something went wrong");
      }
    },
  });

  function onSubmit(values: JoiningFormValues) {
    const formData = new FormData();

    formData.append("doj", new Date(values.doj).toISOString());
    formData.append("department", values.department);
    formData.append("designation", values.designation);

    formData.append("basicSalary", String(values.basicSalary));
    formData.append("hra", String(values.hra ?? 0));
    formData.append(
      "conveyanceAllowance",
      String(values.conveyanceAllowance ?? 0)
    );
    formData.append("specialAllowance", String(values.specialAllowance ?? 0));
    formData.append("grossSalary", String(values.grossSalary));
    formData.append("ctc", String(values.ctc));

    if (values.workLocation)
      formData.append("workLocation", values.workLocation);
    if (values.shiftType) formData.append("shiftType", values.shiftType);

    /* -------------------- Personal Information -------------------- */
    formData.append("fullName", values.fullName);
    formData.append("fatherName", values.fatherName);
    formData.append("dob", new Date(values.dob).toISOString());
    formData.append("gender", values.gender);
    if (values.maritalStatus)
      formData.append("maritalStatus", values.maritalStatus);
    if (values.nationality) formData.append("nationality", values.nationality);

    formData.append("aadhaar", values.aadhaar);
    formData.append("pan", values.pan);
    formData.append("mobile", values.mobile);

    if (values.altMobile) formData.append("altMobile", values.altMobile);
    if (values.email) formData.append("email", values.email);

    /* -------------------- Address -------------------- */
    formData.append("currentAddress", values.currentAddress);
    formData.append("permanentAddress", values.permanentAddress);

    /* -------------------- Bank Details -------------------- */
    formData.append("bankName", values.bankName);
    formData.append("branchName", values.branchName);
    formData.append("accountNumber", values.accountNumber);
    formData.append("ifsc", values.ifsc);

    /* -------------------- Files (REQUIRED) -------------------- */
    if (!values.passportPhoto || !values.aadhaarImage || !values.panImage) {
      toast.error("All documents are required");
      return;
    }

    formData.append("passportPhoto", values.passportPhoto);
    formData.append("aadhaarImage", values.aadhaarImage);
    formData.append("panImage", values.panImage);

    addMutation.mutate(formData);
  }

  return (
    <div className="py-8">
      <div className="px-5">
        <h1 className="text-3xl font-bold text-center mb-10">
          Employee Joining Form
        </h1>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-12">
            {/* Personal Information */}
            <section className="space-y-6">
              <h2 className="text-2xl font-semibold border-b pb-2">
                Personal Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Full Name <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="fatherName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Father's Name <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dob"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Date of Birth <span className="text-red-500">*</span>
                      </FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {field.value ? (
                                format(new Date(field.value), "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            captionLayout="dropdown"
                            selected={
                              field.value ? new Date(field.value) : undefined
                            }
                            onSelect={(date) =>
                              field.onChange(
                                date ? date.toISOString().split("T")[0] : ""
                              )
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Gender <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="flex flex-row space-x-6"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="Male" id="male" />
                            <Label htmlFor="male">Male</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="Female" id="female" />
                            <Label htmlFor="female">Female</Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="aadhaar"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Aadhaar Number <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="12 digits"
                          maxLength={12}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="pan"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        PAN Number <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. ABCDE1234F" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="mobile"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Mobile Number <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input type="tel" {...field} maxLength={10} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="altMobile"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Alternate Mobile</FormLabel>
                      <FormControl>
                        <Input type="tel" {...field} maxLength={10} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Email<span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="maritalStatus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Marital Status</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={(value) =>
                            field.onChange(
                              value === "yes" ? "Married" : "Single"
                            )
                          }
                          value={
                            field.value === "Married"
                              ? "yes"
                              : field.value === "Single"
                              ? "no"
                              : undefined
                          }
                          className="flex flex-row space-x-6"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="yes" id="married" />
                            <Label htmlFor="married">Yes (Married)</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="no" id="single" />
                            <Label htmlFor="single">
                              No (Single/Unmarried)
                            </Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="nationality"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nationality</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="currentAddress"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>
                        Current Address <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Textarea rows={4} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="permanentAddress"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>
                        Permanent Address{" "}
                        <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Textarea rows={4} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </section>

            {/* Office Information */}
            <section className="space-y-6">
              <h2 className="text-2xl font-semibold border-b pb-2">
                Office Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="doj"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Date of Joining <span className="text-red-500">*</span>
                      </FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {field.value ? (
                                format(new Date(field.value), "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            captionLayout="dropdown"
                            selected={
                              field.value ? new Date(field.value) : undefined
                            }
                            onSelect={(date) =>
                              field.onChange(
                                date ? date.toISOString().split("T")[0] : ""
                              )
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="department"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Department <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="designation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Designation <span className="text-red-500">*</span>
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select designation" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Executive">Executive</SelectItem>
                          <SelectItem value="SeniorExecutive">
                            Senior Executive
                          </SelectItem>
                          <SelectItem value="JuniorExecutive">
                            Junior Executive
                          </SelectItem>
                          <SelectItem value="Supervisor">Supervisor</SelectItem>
                          <SelectItem value="Admin">Admin</SelectItem>
                          <SelectItem value="Finance">Finance</SelectItem>
                          <SelectItem value="Clerk">Clerk</SelectItem>
                          <SelectItem value="Sales">Sales</SelectItem>
                          <SelectItem value="Partner">Partner</SelectItem>
                          <SelectItem value="Others">Others</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Salary Information subsection - you can wrap them in a div with col-span if you want a visual separator */}
                <div className="col-span-1 md:col-span-2 mt-6 pt-6 border-t">
                  <h3 className="text-lg font-medium mb-4">
                    Salary Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="basicSalary"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Basic Salary (Monthly){" "}
                            <span className="text-red-500">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. 25000" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="hra"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>House Rent Allowance (HRA)</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. 10000" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="conveyanceAllowance"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Conveyance Allowance</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. 1600" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="specialAllowance"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Special / Other Allowance</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. 5000" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="grossSalary"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Gross Salary (Monthly){" "}
                            <span className="text-red-500">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. 45000" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="ctc"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Annual CTC <span className="text-red-500">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. 600000" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="workLocation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Work Location</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="shiftType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Shift Type</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </section>

            {/* Upload Documents */}
            <section className="space-y-6">
              <h2 className="text-2xl font-semibold border-b pb-2">
                Upload Documents
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Passport Size Photo */}
                <Controller
                  name="passportPhoto"
                  control={form.control}
                  render={({ field: { onChange, value } }) => {
                    const handleUpload = (
                      e: React.ChangeEvent<HTMLInputElement>
                    ) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (passportPreview)
                          URL.revokeObjectURL(passportPreview);
                        const newPreview = URL.createObjectURL(file);
                        setPassportPreview(newPreview);
                        onChange(file);
                      }
                    };

                    const handleRemove = () => {
                      if (passportPreview) URL.revokeObjectURL(passportPreview);
                      setPassportPreview(null);
                      onChange(undefined);
                      if (passportRef.current) passportRef.current.value = "";
                    };

                    return (
                      <FormItem>
                        <FormLabel>
                          Passport Size Photo{" "}
                          <span className="text-red-500">*</span>
                        </FormLabel>
                        <div className="space-y-4">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => passportRef.current?.click()}
                          >
                            {value || passportPreview
                              ? "Change Photo"
                              : "Upload Photo"}
                          </Button>
                          <input
                            type="file"
                            accept="image/jpeg,image/jpg,image/png"
                            hidden
                            ref={passportRef}
                            onChange={handleUpload}
                          />
                          {passportPreview && (
                            <div className="space-y-4">
                              <div className="flex justify-center">
                                <img
                                  src={passportPreview}
                                  alt="Passport photo preview"
                                  className="h-48 w-40 object-cover rounded-lg border shadow"
                                />
                              </div>
                              <Button
                                type="button"
                                variant="destructive"
                                className="w-full"
                                onClick={handleRemove}
                              >
                                Remove Photo
                              </Button>
                            </div>
                          )}
                        </div>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />

                {/* Aadhaar Card Image */}
                <Controller
                  name="aadhaarImage"
                  control={form.control}
                  render={({ field: { onChange, value } }) => {
                    const handleUpload = (
                      e: React.ChangeEvent<HTMLInputElement>
                    ) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (aadhaarPreview) URL.revokeObjectURL(aadhaarPreview);
                        const newPreview = URL.createObjectURL(file);
                        setAadhaarPreview(newPreview);
                        onChange(file);
                      }
                    };

                    const handleRemove = () => {
                      if (aadhaarPreview) URL.revokeObjectURL(aadhaarPreview);
                      setAadhaarPreview(null);
                      onChange(undefined);
                      if (aadhaarRef.current) aadhaarRef.current.value = "";
                    };

                    return (
                      <FormItem>
                        <FormLabel>
                          Aadhaar Card Image{" "}
                          <span className="text-red-500">*</span>
                        </FormLabel>
                        <div className="space-y-4">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => aadhaarRef.current?.click()}
                          >
                            {value || aadhaarPreview
                              ? "Change Image"
                              : "Upload Aadhaar"}
                          </Button>
                          <input
                            type="file"
                            accept="image/jpeg,image/jpg,image/png"
                            hidden
                            ref={aadhaarRef}
                            onChange={handleUpload}
                          />
                          {aadhaarPreview && (
                            <div className="space-y-4">
                              <div className="flex justify-center">
                                <img
                                  src={aadhaarPreview}
                                  alt="Aadhaar preview"
                                  className="max-w-full max-h-96 object-contain rounded-lg border shadow"
                                />
                              </div>
                              <Button
                                type="button"
                                variant="destructive"
                                className="w-full"
                                onClick={handleRemove}
                              >
                                Remove Image
                              </Button>
                            </div>
                          )}
                        </div>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />

                {/* PAN Card Image */}
                <Controller
                  name="panImage"
                  control={form.control}
                  render={({ field: { onChange, value } }) => {
                    const handleUpload = (
                      e: React.ChangeEvent<HTMLInputElement>
                    ) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (panPreview) URL.revokeObjectURL(panPreview);
                        const newPreview = URL.createObjectURL(file);
                        setPanPreview(newPreview);
                        onChange(file);
                      }
                    };

                    const handleRemove = () => {
                      if (panPreview) URL.revokeObjectURL(panPreview);
                      setPanPreview(null);
                      onChange(undefined);
                      if (panRef.current) panRef.current.value = "";
                    };

                    return (
                      <FormItem>
                        <FormLabel>
                          PAN Card Image <span className="text-red-500">*</span>
                        </FormLabel>
                        <div className="space-y-4">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => panRef.current?.click()}
                          >
                            {value || panPreview
                              ? "Change Image"
                              : "Upload PAN"}
                          </Button>
                          <input
                            type="file"
                            accept="image/jpeg,image/jpg,image/png"
                            hidden
                            ref={panRef}
                            onChange={handleUpload}
                          />
                          {panPreview && (
                            <div className="space-y-4">
                              <div className="flex justify-center">
                                <img
                                  src={panPreview}
                                  alt="PAN preview"
                                  className="max-w-full max-h-96 object-contain rounded-lg border shadow"
                                />
                              </div>
                              <Button
                                type="button"
                                variant="destructive"
                                className="w-full"
                                onClick={handleRemove}
                              >
                                Remove Image
                              </Button>
                            </div>
                          )}
                        </div>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
              </div>
            </section>

            {/* Bank Details */}
            <section className="space-y-6">
              <h2 className="text-2xl font-semibold border-b pb-2">
                Bank Details
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="bankName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Bank Name <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="branchName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Branch Name <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="accountNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Account Number <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="ifsc"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        IFSC Code <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </section>

            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={addMutation.isPending}
            >
              Submit Joining Form
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}

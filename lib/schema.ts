import * as z from "zod";

/**
 * COMMON REGEX
 */
const NUMERIC_ONLY = /^[0-9]+$/;
const MOBILE_REGEX = /^[6-9][0-9]{9}$/;
const AADHAAR_REGEX = /^[2-9][0-9]{11}$/;
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const EMAIL_REGEX = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;

/**
 * FILE VALIDATION HELPERS
 */
const IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export const joiningFormSchema = z
  .object({
    // OFFICE INFORMATION

    doj: z.string().min(1, "Date of Joining is required"),

    department: z.string().min(1, "Department is required"),

    designation: z.string().min(1, "Designation is required"),

    basicSalary: z
      .string()
      .regex(NUMERIC_ONLY, "Basic Salary must be numeric")
      .min(1, "Basic Salary is required"),

    hra: z.string().regex(NUMERIC_ONLY, "HRA must be numeric").optional(),

    conveyanceAllowance: z
      .string()
      .regex(NUMERIC_ONLY, "Conveyance Allowance must be numeric")
      .optional(),

    specialAllowance: z
      .string()
      .regex(NUMERIC_ONLY, "Special Allowance must be numeric")
      .optional(),

    grossSalary: z
      .string()
      .regex(NUMERIC_ONLY, "Gross Salary must be numeric")
      .min(1, "Gross Salary is required"),

    ctc: z
      .string()
      .regex(NUMERIC_ONLY, "CTC must be numeric")
      .min(1, "Annual CTC is required"),

    workLocation: z.string().optional(),
    shiftType: z.string().optional(),

    // PERSONAL INFORMATION
    fullName: z
      .string()
      .min(1, "Full name is required")
      .regex(/^[A-Za-z\s]+$/, "Only alphabets allowed"),

    fatherName: z
      .string()
      .min(1, "Father's name is required")
      .regex(/^[A-Za-z\s]+$/, "Only alphabets allowed"),

    dob: z.string().min(1, "Date of Birth is required"),

    gender: z
      .enum(["Male", "Female", "Other"])
      .refine((val) => val !== undefined && val !== null, {
        message: "Gender is required",
      }),

    aadhaar: z.string().regex(AADHAAR_REGEX, "Invalid Aadhaar number"),

    pan: z.string().regex(PAN_REGEX, "Invalid PAN format (ABCDE1234F)"),

    mobile: z.string().regex(MOBILE_REGEX, "Invalid mobile number"),

    altMobile: z
      .string()
      .regex(MOBILE_REGEX, "Invalid alternate mobile number")
      .optional(),

    email: z.string().regex(EMAIL_REGEX, "Invalid email address"),

    currentAddress: z.string().min(5, "Current address is required"),

    permanentAddress: z.string().min(5, "Permanent address is required"),

    maritalStatus: z.enum(["Single", "Married"]).optional(),

    nationality: z
      .string()
      .regex(/^[A-Za-z\s]+$/, "Only alphabets allowed")
      .optional(),

    // BANK DETAILS
    bankName: z
      .string()
      .min(1, "Bank name is required")
      .regex(/^[A-Za-z\s]+$/, "Only alphabets allowed"),

    branchName: z
      .string()
      .min(1, "Branch name is required")
      .regex(/^[A-Za-z\s]+$/, "Only alphabets allowed"),

    accountNumber: z
      .string()
      .regex(NUMERIC_ONLY, "Account number must be numeric")
      .min(6, "Invalid account number"),

    ifsc: z.string().regex(IFSC_REGEX, "Invalid IFSC code"),

    // DOCUMENT UPLOADS
    passportPhoto: z
      .instanceof(File, { message: "Passport photo is required" })
      .refine((file) => IMAGE_TYPES.includes(file.type), {
        message: "Passport photo must be JPG/JPEG/PNG",
      })
      .refine((file) => file.size <= MAX_FILE_SIZE, {
        message: "Passport photo must be under 5MB",
      }),

    aadhaarImage: z
      .instanceof(File, { message: "Aadhaar image is required" })
      .refine((file) => IMAGE_TYPES.includes(file.type), {
        message: "Aadhaar image must be JPG/JPEG/PNG",
      })
      .refine((file) => file.size <= MAX_FILE_SIZE, {
        message: "Aadhaar image must be under 5MB",
      }),

    panImage: z
      .instanceof(File, { message: "PAN image is required" })
      .refine((file) => IMAGE_TYPES.includes(file.type), {
        message: "PAN image must be JPG/JPEG/PNG",
      })
      .refine((file) => file.size <= MAX_FILE_SIZE, {
        message: "PAN image must be under 5MB",
      }),
  })
  .superRefine((data, ctx) => {
    if (data.altMobile && data.mobile === data.altMobile) {
      ctx.addIssue({
        path: ["altMobile"],
        message: "Alternate mobile number cannot be the same as mobile number",
        code: z.ZodIssueCode.custom,
      });
    }
  });

const optionalImageField = z
  .instanceof(File)
  .optional()
  .refine((file) => file === undefined || IMAGE_TYPES.includes(file.type), {
    message: "Image must be JPG/JPEG/PNG",
  })
  .refine((file) => file === undefined || file.size <= MAX_FILE_SIZE, {
    message: "Image must be under 5MB",
  });

export const editJoiningFormSchema = z
  .object({
    // OFFICE INFORMATION
    doj: z.string().min(1, "Date of Joining is required"),

    department: z.string().min(1, "Department is required"),

    designation: z.string().min(1, "Designation is required"),

    basicSalary: z
      .string()
      .regex(NUMERIC_ONLY, "Basic Salary must be numeric")
      .min(1, "Basic Salary is required"),

    hra: z.string().regex(NUMERIC_ONLY, "HRA must be numeric").optional(),

    conveyanceAllowance: z
      .string()
      .regex(NUMERIC_ONLY, "Conveyance Allowance must be numeric")
      .optional(),

    specialAllowance: z
      .string()
      .regex(NUMERIC_ONLY, "Special Allowance must be numeric")
      .optional(),

    grossSalary: z
      .string()
      .regex(NUMERIC_ONLY, "Gross Salary must be numeric")
      .min(1, "Gross Salary is required"),

    ctc: z
      .string()
      .regex(NUMERIC_ONLY, "CTC must be numeric")
      .min(1, "Annual CTC is required"),

    workLocation: z.string().optional(),
    shiftType: z.string().optional(),

    // PERSONAL INFORMATION
    fullName: z
      .string()
      .min(1, "Full name is required")
      .regex(/^[A-Za-z\s]+$/, "Only alphabets allowed"),

    fatherName: z
      .string()
      .min(1, "Father's name is required")
      .regex(/^[A-Za-z\s]+$/, "Only alphabets allowed"),

    dob: z.string().min(1, "Date of Birth is required"),

    gender: z
      .enum(["Male", "Female", "Other"])
      .refine((val) => val !== undefined && val !== null, {
        message: "Gender is required",
      }),

    aadhaar: z.string().regex(AADHAAR_REGEX, "Invalid Aadhaar number"),

    pan: z.string().regex(PAN_REGEX, "Invalid PAN format (ABCDE1234F)"),

    mobile: z.string().regex(MOBILE_REGEX, "Invalid mobile number"),

    altMobile: z
      .string()
      .regex(MOBILE_REGEX, "Invalid alternate mobile number")
      .optional(),

    email: z.string().regex(EMAIL_REGEX, "Invalid email address"),

    currentAddress: z.string().min(5, "Current address is required"),

    permanentAddress: z.string().min(5, "Permanent address is required"),

    maritalStatus: z.enum(["Single", "Married"]).optional(),

    nationality: z
      .string()
      .regex(/^[A-Za-z\s]+$/, "Only alphabets allowed")
      .optional(),

    // BANK DETAILS
    bankName: z
      .string()
      .min(1, "Bank name is required")
      .regex(/^[A-Za-z\s]+$/, "Only alphabets allowed"),

    branchName: z
      .string()
      .min(1, "Branch name is required")
      .regex(/^[A-Za-z\s]+$/, "Only alphabets allowed"),

    accountNumber: z
      .string()
      .regex(NUMERIC_ONLY, "Account number must be numeric")
      .min(6, "Invalid account number"),

    ifsc: z.string().regex(IFSC_REGEX, "Invalid IFSC code"),

    // DOCUMENT UPLOADS - OPTIONAL IN EDIT
    passportPhoto: optionalImageField,
    aadhaarImage: optionalImageField,
    panImage: optionalImageField,
  })
  .superRefine((data, ctx) => {
    if (data.altMobile && data.mobile === data.altMobile) {
      ctx.addIssue({
        path: ["altMobile"],
        message: "Alternate mobile number cannot be the same as mobile number",
        code: z.ZodIssueCode.custom,
      });
    }
  });

export type JoiningFormValues = z.infer<typeof joiningFormSchema>;
export type EditJoiningFormValues = z.infer<typeof editJoiningFormSchema>;

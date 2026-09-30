const { z } = require("zod");

const StudentIdParamSchema = z.object({
    params: z.object({
        id: z.string().regex(/^\d+$/, "ID must be a valid number")
    })
});

const StudentCreateSchema = z.object({
    body: z.object({
        name: z.string().min(1, "Name is required"),
        email: z.string().email("Valid email is required"),
        gender: z.string().min(1, "Gender is required"),
        dob: z.string().min(1, "Date of birth is required"),
        phone: z.string().min(1, "Phone is required"),
        class: z.string().min(1, "Class is required"),
        section: z.string().optional().nullable(),
        roll: z.union([z.string(), z.number()]).optional().nullable(),
        admissionDate: z.string().min(1, "Admission date is required"),
        currentAddress: z.string().min(1, "Current address is required"),
        permanentAddress: z.string().min(1, "Permanent address is required"),
        fatherName: z.string().min(1, "Father name is required"),
        fatherPhone: z.string().optional().nullable(),
        motherName: z.string().optional().nullable(),
        motherPhone: z.string().optional().nullable(),
        guardianName: z.string().min(1, "Guardian name is required"),
        guardianPhone: z.string().min(1, "Guardian phone is required"),
        relationOfGuardian: z.string().min(1, "Relation of guardian is required"),
        systemAccess: z.boolean().optional()
    })
});

const StudentUpdateSchema = z.object({
    params: z.object({
        id: z.string().regex(/^\d+$/, "ID must be a valid number")
    }),
    body: z.object({
        name: z.string().min(1, "Name is required").optional(),
        email: z.string().email("Valid email is required").optional(),
        gender: z.string().optional(),
        dob: z.string().optional(),
        phone: z.string().optional(),
        class: z.string().optional(),
        section: z.string().optional().nullable(),
        roll: z.union([z.string(), z.number()]).optional().nullable(),
        admissionDate: z.string().optional(),
        currentAddress: z.string().optional(),
        permanentAddress: z.string().optional(),
        fatherName: z.string().optional(),
        fatherPhone: z.string().optional().nullable(),
        motherName: z.string().optional().nullable(),
        motherPhone: z.string().optional().nullable(),
        guardianName: z.string().optional(),
        guardianPhone: z.string().optional(),
        relationOfGuardian: z.string().optional(),
        systemAccess: z.boolean().optional()
    })
});

module.exports = {
    StudentIdParamSchema,
    StudentCreateSchema,
    StudentUpdateSchema
};

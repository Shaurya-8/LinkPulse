import { z } from "zod";

export const userStatusSchema = z.enum([
    "active",
    "inactive",
    "suspended",
    "deleted",
]);

export const userNameSchema = z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be at most 100 characters");

export const userEmailSchema = z
    .email("Invalid email address")
    .toLowerCase();

export const userPasswordSchema = z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password must be at most 72 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character");

export const createUserSchema = z.object({
    name: userNameSchema,
    email: userEmailSchema,
    password: userPasswordSchema,
});

export type CreateUserDTO = z.output<typeof createUserSchema>;

export const loginUserSchema = z.object({
    email: userEmailSchema,

    password: z.string().min(1, "Password is required"),
});
export type LoginUserDTO = z.output<typeof loginUserSchema>;

export const updateUserSchema = z
    .object({
        name: userNameSchema.optional(),

        email: userEmailSchema.optional(),

        status: userStatusSchema.optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
        message: "At least one field is required",
    });
export type UpdateUserDTO = z.output<typeof updateUserSchema>;

export const changePasswordSchema = z.object({
    currentPassword: z.string().min(1, "Current password is required"),

    newPassword: userPasswordSchema,
});

export type ChangePasswordDTO = z.output<typeof changePasswordSchema>;

export const userParamsSchema = z.object({
    userId: z.uuid("Invalid user ID"),
});
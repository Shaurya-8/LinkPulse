import z, { email } from "zod";

export const registerSchema = z.object({
    email: z.email().toLowerCase().trim(),
    password: z.string().trim(),
    firstName: z.string().trim(),
    lastName: z.string().trim().optional(),
    avatarUrl: z.string().trim().optional()
});

export const updateUserSchema = z.object({
    password: z.string().trim().optional(),
    firstName: z.string().trim(),
    lastName: z.string().trim().optional(),
    avatarUrl: z.string().trim().optional()
});


export const loginSchema = z.object({
    email: z.email().lowercase().trim(),
    password: z.string().trim()
});


export const deleteSchema = z.object({
    email: z.string().trim(),
    password: z.string().trim()
})

export const refreshTokenSchema = z.object({
    refreshToken: z.string().trim(),
});

export const sendResetPasswordEmailSchema = z.object({
    email: z.string().trim(),
    newPassword: z.string().trim()
});

export type SendResetPasswordEmailDto = z.infer<typeof sendResetPasswordEmailSchema>;
export type RefreshTokenDto = z.infer<typeof refreshTokenSchema>;
export type RegisterDto = z.infer<typeof registerSchema>;
export type UpdateUserDto = z.infer<typeof updateUserSchema>;
export type LoginDto = z.infer<typeof loginSchema>;
export type DeleteDto = z.infer<typeof deleteSchema>;
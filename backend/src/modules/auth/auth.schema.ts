import z, { email } from "zod";

const passwordSchema = z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be at most 128 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

export const registerSchema = z.object({
    body: z.object({

        email: z.email().toLowerCase().trim(),
        password: passwordSchema,
        firstName: z.string().trim(),
        lastName: z.string().trim().optional(),
        avatarUrl: z.string().trim().optional()
    })
});

export const updateUserSchema = z.object({
    body: z.object({
        password: z.string().trim().optional(),
        firstName: z.string().trim(),
        lastName: z.string().trim().optional(),
        avatarUrl: z.string().trim().optional()
    })
});


export const loginSchema = z.object({
    body: z.object({
        email: z.email().lowercase().trim(),
        password: z.string().trim()
    })
});


export const deleteSchema = z.object({
    body: z.object({

        email: z.string().trim(),
        password: z.string().trim()
    })
})

export const refreshTokenSchema = z.object({
    body: z.object({

        refreshToken: z.string().trim(),
    })
});

export const sendResetPasswordEmailSchema = z.object({
    body: z.object({
        email: z.string().trim(),
        newPassword: z.string().trim()
    })
});

export type SendResetPasswordEmailInput = z.infer<typeof sendResetPasswordEmailSchema>['body'];
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>['body'];
export type RegisterInput = z.infer<typeof registerSchema>['body'];
export type UpdateUserInput = z.infer<typeof updateUserSchema>['body'];
export type LoginInput = z.infer<typeof loginSchema>['body'];
export type DeleteInput = z.infer<typeof deleteSchema>['body'];
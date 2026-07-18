import {  z } from "zod";
const createLink = z.object({
    longUrl: z.string(),
    customAlias: z.string().optional(),
    isOneTime: z.boolean().optional(),
    title: z.string().optional(),
    description: z.string().optional(),
    faviconUrl: z.string().optional(),
    expiresAt: z.date().optional(),
    passwordHash: z.string().optional(),
})

export type CreateLinkDto = z.infer<typeof createLink>;
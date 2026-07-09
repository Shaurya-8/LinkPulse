import { z } from "zod";

export const linkSchema = z.object({
    longUrl: z.string().trim(),
    customAlias: z.string().trim().optional(),
    expiration: z.date().optional(),
    password: z.string().trim().optional(),
    isOneTime: z.boolean().default(false),
    title: z.string().trim().optional(),
    description: z.string().trim().optional(),
    faviconUrl: z.string().trim().optional()
})

export type LinkDto = z.infer<typeof linkSchema>

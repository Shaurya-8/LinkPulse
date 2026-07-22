import { z } from "zod";

const tag = z.object({
    name: z.string().min(1).max(30),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#6366f1'),
});

export const createLink = z.object({

    longUrl: z.string().url('Invalid URL').max(2048),
    customAlias: z
        .string()
        .min(3)
        .max(64)
        .regex(/^[a-zA-Z0-9_-]+$/, 'Alias can only contain letters, numbers, hyphens and underscores')
        .optional(),
    isOneTime: z.boolean().optional(),
    title: z.string().max(255).optional(),
    description: z.string().max(1000).optional(),
    passwordHash: z.string().min(4).max(100).optional(),
    expiresAt: z.string().datetime().optional(),
    maxClicks: z.number().int().min(1).max(1000000).optional(),
    redirectType: z.enum(['TEMPORARY', 'PERMANENT']).default('TEMPORARY'),
    tags: z.array(tag).max(10).optional(),

});

export const updateLink = z.object({
    longUrl: z.string().url().max(2048).optional(),
    title: z.string().max(255).nullable().optional(),
    description: z.string().max(1000).nullable().optional(),
    password: z.string().min(4).max(100).nullable().optional(),
    expiresAt: z.string().datetime().nullable().optional(),
    maxClicks: z.number().int().min(1).nullable().optional(),
    redirectType: z.enum(['TEMPORARY', 'PERMANENT']).optional(),
    status: z.enum(['ACTIVE', 'INACTIVE', 'EXPIRED']).optional(),
    tags: z.array(tag).max(10).optional(),
});

export const getLinks = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().max(200).optional(),
    status: z.enum(['ACTIVE', 'INACTIVE', 'EXPIRED']).optional(),
    tag: z.string().optional(),
    sortBy: z.enum(['createdAt', 'clickCount', 'title']).default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),

});

export const getLinkById = z.object({
    id: z.string().cuid(),
});

export const checkAlias = z.object({
    alias: z.string().min(1).max(64),
});

export const bulkCreate = z.object({
    links: z
        .array(
            z.object({
                longUrl: z.string().url().max(2048),
                customAlias: z.string().max(64).optional(),
                title: z.string().max(255).optional(),
                expiresAt: z.string().datetime().optional(),
                tags: z.array(z.string().max(30)).max(5).optional(),
            }),
        )
        .min(1, 'At least one link is required')
        .max(1000, 'Maximum 1000 links per bulk request'),
});

export const redirectRule = z.object({
    rules: z.array(
        z.object({
            conditionType: z.enum(['DEVICE', 'GEO', 'LANGUAGE', 'TIME_OF_DAY', 'DAY_OF_WEEK', 'DATE_RANGE']),
            conditionValue: z.string(), // JSON
            targetUrl: z.string().url(),
            label: z.string().max(100).optional(),
            priority: z.number().int().min(0).max(100).default(0),
            isActive: z.boolean().default(true),
        }),
    ).max(20),

});

export const abTest = z.object({

    name: z.string().min(1).max(100),
    variants: z.array(
        z.object({
            name: z.string().min(1).max(100),
            url: z.string().url(),
            weight: z.number().int().min(0).max(100),
        }),
    ).min(2, 'At least 2 variants required').max(10),
}).refine((data) => {
    const totalWeight = data.variants.reduce((sum, v) => sum + v.weight, 0);
    return totalWeight === 100;
}, 'Variant weights must sum to 100')


export type CreateLinkInput = z.infer<typeof createLink>;
export type UpdateLinkInput = z.infer<typeof updateLink>;
export type GetLinksQuery = z.infer<typeof getLinks>;
export type BulkCreateInput = z.infer<typeof bulkCreate>;

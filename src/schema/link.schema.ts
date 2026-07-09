import { z } from "zod";
import { normalizeUrl } from "../common/utils/link";


const shortCodeSchema = z
  .string()
  .min(3)
  .max(20)
  .regex(/^[a-zA-Z0-9_-]+$/, {
    message: "Only letters, numbers, underscores, and hyphens are allowed",
  });

const passwordSchema = z.string().min(6).max(72);


export const createUrlSchema = z.object({
    originalUrl: z
        .string()
        .transform(normalizeUrl)
});



const expiresAtSchema = z.iso.datetime();

const clickLimitSchema = z.number().int().positive();

const createLinkSchema = z.object({
  longUrl: createUrlSchema,
  customCode: shortCodeSchema.optional(),
  expiresAt: expiresAtSchema.optional(),
  clickLimit: clickLimitSchema.optional(),
  password: passwordSchema.optional(),
});

export type createLinkSchema = z.infer<typeof createLinkSchema>;

const updateLinkSchema = z
  .object({
    longUrl: createUrlSchema.optional(),
    customCode: shortCodeSchema.optional(),
    expiresAt: expiresAtSchema.nullable().optional(),
    clickLimit: clickLimitSchema.nullable().optional(),
    password: passwordSchema.nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });

const linkParamsSchema = z.object({
  shortCode: shortCodeSchema,
});

const insertLinkSchema = z.object({
  short_code: shortCodeSchema,
  long_url: z.string().url(),
  normalized_url: z.string().url(),
  owner_type: z.enum(["user", "guest"]),
  user_id: z.string().nullable(),
  guest_id_hash: z.string().nullable(),
  plan_type_at_creation: z.enum(["free", "pro", "enterprise"]),
  password_hash: z.string().nullable(),
  is_active: z.boolean().default(true),
  expires_at: z.date().nullable(),
  click_limit: z.number().int().positive().nullable(),
  total_click: z.number().int().nonnegative().default(0),
});

const linkRowSchema = z.object({
  id: z.string(),
  short_code: z.string(),
  long_url: z.string(),
  normalized_url: z.string(),
  owner_type: z.enum(["user", "guest"]),
  user_id: z.string().nullable(),
  guest_id_hash: z.string().nullable(),
  plan_type_at_creation: z.enum(["free", "pro", "enterprise"]),
  password_hash: z.string().nullable(),
  is_active: z.boolean(),
  expires_at: z.date().nullable(),
  click_limit: z.number().int().positive().nullable(),
  total_click: z.number().int().nonnegative(),
  created_at: z.date(),
  updated_at: z.date(),
});

const publicLinkSchema = linkRowSchema
  .omit({
    password_hash: true,
    guest_id_hash: true,
  })
  .transform((link) => ({
    id: link.id,
    shortCode: link.short_code,
    longUrl: link.long_url,
    ownerType: link.owner_type,
    planTypeAtCreation: link.plan_type_at_creation,
    isActive: link.is_active,
    expiresAt: link.expires_at,
    clickLimit: link.click_limit,
    totalClick: link.total_click,
    createdAt: link.created_at,
    updatedAt: link.updated_at,
  }));

export {
  createLinkSchema,
  updateLinkSchema,
  linkParamsSchema,
  insertLinkSchema,
  linkRowSchema,
  publicLinkSchema,
};
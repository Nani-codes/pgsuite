import { z } from 'zod/v4';

export const createTenantSchema = z.object({
  name: z.string().min(1).max(255),
  phone: z.string().min(10).max(20),
  email: z.email().optional(),
  emergencyContactName: z.string().max(255).optional(),
  emergencyContactPhone: z.string().max(20).optional(),
  bedId: z.uuid(),
  propertyId: z.uuid(),
  rentAmount: z.number().positive(),
  securityDeposit: z.number().min(0).optional().default(0),
  billingDay: z.number().int().min(1).max(28),
  moveInDate: z.string(),
});

export const updateTenantSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  phone: z.string().min(10).max(20).optional(),
  email: z.email().optional(),
  emergencyContactName: z.string().max(255).optional(),
  emergencyContactPhone: z.string().max(20).optional(),
});

export type CreateTenantInput = z.infer<typeof createTenantSchema>;
export type UpdateTenantInput = z.infer<typeof updateTenantSchema>;

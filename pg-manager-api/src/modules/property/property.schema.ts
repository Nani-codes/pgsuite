import { z } from 'zod/v4';

export const createPropertySchema = z.object({
  name: z.string().min(1).max(255),
  address: z.string().min(1),
  city: z.string().min(1).max(100),
  totalBeds: z.number().int().min(0).optional().default(0),
  amenities: z.array(z.string()).optional().default([]),
});

export const updatePropertySchema = createPropertySchema.partial();

export const createRoomSchema = z.object({
  floorId: z.uuid().optional(),
  roomNumber: z.string().min(1).max(20),
  roomType: z.enum(['single', 'double', 'triple']),
  rentAmount: z.number().positive(),
});

export const createFloorSchema = z.object({
  label: z.string().min(1).max(100),
});

export type CreatePropertyInput = z.infer<typeof createPropertySchema>;
export type UpdatePropertyInput = z.infer<typeof updatePropertySchema>;
export type CreateRoomInput = z.infer<typeof createRoomSchema>;
export type CreateFloorInput = z.infer<typeof createFloorSchema>;

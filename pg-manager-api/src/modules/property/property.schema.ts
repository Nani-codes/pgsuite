import { z } from 'zod/v4';

export const createPropertySchema = z.object({
  name: z.string().min(1).max(255),
  address: z.string().min(1),
  city: z.string().min(1).max(100),
  state: z.string().min(1).max(100).optional(),
  pincode: z.string().min(3).max(20).optional(),
  availableFor: z.string().min(1).max(100).optional(),
  about: z.string().max(5000).optional(),
  imageUrls: z.array(z.url()).optional().default([]),
  listPublicly: z.boolean().optional().default(false),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
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

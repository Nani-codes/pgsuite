import prisma from '../../config/db.js';
import type { DuesFrequency, InvoiceItemType } from '@prisma/client';

interface PackageItemInput {
  type?: InvoiceItemType;
  description: string;
  amount: number;
}

interface CreatePackageInput {
  ownerId: string;
  propertyId?: string;
  name: string;
  frequency?: DuesFrequency;
  autoGenerate?: boolean;
  items: PackageItemInput[];
}

interface UpdatePackageInput {
  name?: string;
  frequency?: DuesFrequency;
  autoGenerate?: boolean;
  isActive?: boolean;
  items?: PackageItemInput[];
}

export async function createDuesPackage(data: CreatePackageInput) {
  if (data.propertyId) {
    const property = await prisma.property.findFirst({
      where: { id: data.propertyId, ownerId: data.ownerId, deletedAt: null },
    });
    if (!property) throw new Error('Property not found');
  }

  const totalAmount = data.items.reduce((sum, item) => sum + item.amount, 0);

  return prisma.duesPackage.create({
    data: {
      ownerId: data.ownerId,
      propertyId: data.propertyId,
      name: data.name,
      frequency: data.frequency ?? 'monthly',
      totalAmount,
      autoGenerate: data.autoGenerate ?? true,
      items: {
        create: data.items.map((item) => ({
          type: item.type ?? 'other',
          description: item.description,
          amount: item.amount,
        })),
      },
    },
    include: { items: true, property: true },
  });
}

export async function updateDuesPackage(id: string, ownerId: string, data: UpdatePackageInput) {
  const pkg = await prisma.duesPackage.findFirst({ where: { id, ownerId } });
  if (!pkg) throw new Error('Dues package not found');

  // If items are being updated, delete old ones and create new ones
  if (data.items) {
    const totalAmount = data.items.reduce((sum, item) => sum + item.amount, 0);

    return prisma.$transaction(async (tx) => {
      // Delete existing items
      await tx.duesPackageItem.deleteMany({ where: { packageId: id } });

      // Update package + create new items
      return tx.duesPackage.update({
        where: { id },
        data: {
          ...(data.name ? { name: data.name } : {}),
          ...(data.frequency ? { frequency: data.frequency } : {}),
          ...(data.autoGenerate !== undefined ? { autoGenerate: data.autoGenerate } : {}),
          ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
          totalAmount,
          items: {
            create: data.items!.map((item) => ({
              type: item.type ?? 'other',
              description: item.description,
              amount: item.amount,
            })),
          },
        },
        include: { items: true, property: true },
      });
    });
  }

  return prisma.duesPackage.update({
    where: { id },
    data: {
      ...(data.name ? { name: data.name } : {}),
      ...(data.frequency ? { frequency: data.frequency } : {}),
      ...(data.autoGenerate !== undefined ? { autoGenerate: data.autoGenerate } : {}),
      ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
    },
    include: { items: true, property: true },
  });
}

/**
 * Assign a dues package to a lease.
 */
export async function assignPackageToLease(packageId: string, leaseId: string, ownerId: string) {
  const pkg = await prisma.duesPackage.findFirst({ where: { id: packageId, ownerId } });
  if (!pkg) throw new Error('Dues package not found');

  const lease = await prisma.lease.findFirst({
    where: { id: leaseId, property: { ownerId } },
  });
  if (!lease) throw new Error('Lease not found');

  return prisma.lease.update({
    where: { id: leaseId },
    data: { duesPackageId: packageId },
    include: { duesPackage: { include: { items: true } } },
  });
}

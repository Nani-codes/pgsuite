import { PrismaClient, type Bed } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const owner = await prisma.owner.upsert({
    where: { phone: '9876543210' },
    update: {},
    create: {
      name: 'Ravi Kumar',
      phone: '9876543210',
      email: 'ravi@example.com',
      plan: 'pro',
      isActive: true,
    },
  });

  // eslint-disable-next-line no-console
  console.log('Created owner:', owner.id, owner.name);

  const property = await prisma.property.create({
    data: {
      ownerId: owner.id,
      name: 'Sunrise PG Gachibowli',
      address: '123 Tech Park Road, Gachibowli',
      city: 'Hyderabad',
      amenities: ['wifi', 'food', 'ac', 'laundry'],
    },
  });

  // eslint-disable-next-line no-console
  console.log('Created property:', property.id, property.name);

  const floor = await prisma.floor.create({
    data: {
      propertyId: property.id,
      label: 'Ground Floor',
    },
  });

  const rooms = await Promise.all([
    prisma.room.create({
      data: {
        propertyId: property.id,
        floorId: floor.id,
        roomNumber: '101',
        roomType: 'double',
        rentAmount: 8000,
      },
    }),
    prisma.room.create({
      data: {
        propertyId: property.id,
        floorId: floor.id,
        roomNumber: '102',
        roomType: 'triple',
        rentAmount: 6000,
      },
    }),
    prisma.room.create({
      data: {
        propertyId: property.id,
        floorId: floor.id,
        roomNumber: '103',
        roomType: 'single',
        rentAmount: 12000,
      },
    }),
  ]);

  const beds: Bed[] = [];
  for (const room of rooms) {
    const count = { single: 1, double: 2, triple: 3 }[room.roomType];
    for (let i = 0; i < count; i++) {
      const bed = await prisma.bed.create({
        data: {
          roomId: room.id,
          label: `Bed ${String.fromCharCode(65 + i)}`,
          status: i === 0 && room.roomNumber === '101' ? 'occupied' : 'vacant',
        },
      });
      beds.push(bed);
    }
  }

  // eslint-disable-next-line no-console
  console.log(`Created ${rooms.length} rooms with ${beds.length} beds`);

  const occupiedBed = beds.find(b => b.status === 'occupied')!;
  const tenant = await prisma.tenant.upsert({
    where: {
      ownerId_phone: {
        ownerId: owner.id,
        phone: '9123456789',
      },
    },
    update: {
      name: 'Priya Sharma',
      email: 'priya@example.com',
      emergencyContactName: 'Deepa Sharma',
      emergencyContactPhone: '9111222333',
      status: 'active',
    },
    create: {
      ownerId: owner.id,
      name: 'Priya Sharma',
      phone: '9123456789',
      email: 'priya@example.com',
      emergencyContactName: 'Deepa Sharma',
      emergencyContactPhone: '9111222333',
      status: 'active',
    },
  });

  await prisma.lease.create({
    data: {
      tenantId: tenant.id,
      bedId: occupiedBed.id,
      propertyId: property.id,
      rentAmount: 8000,
      securityDeposit: 16000,
      depositStatus: 'paid',
      billingDay: 1,
      moveInDate: new Date('2026-01-15'),
      status: 'active',
    },
  });

  // eslint-disable-next-line no-console
  console.log('Created tenant:', tenant.id, tenant.name, '→ bed', occupiedBed.label);

  // eslint-disable-next-line no-console
  console.log('\nSeed complete!');
  // eslint-disable-next-line no-console
  console.log(`Owner ID: ${owner.id}`);
  // eslint-disable-next-line no-console
  console.log(`Property ID: ${property.id}`);
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

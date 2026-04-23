import fs from 'node:fs/promises';
import path from 'node:path';
import prisma from '../config/db.js';

type SourceImage = { url?: string | null };
type SourceMicrosite = {
  about?: string | null;
  common_amenities?: string | null;
  services_amenities?: string | null;
  food_amenities?: string | null;
};
type SourceProperty = {
  id: string;
  pg_id?: string | null;
  pg_number?: number | null;
  eazypg_id?: string | null;
  pg_name?: string | null;
  address_line_1?: string | null;
  address_line_2?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  pg_available_for?: string | null;
  images?: SourceImage[] | null;
  microsite_data?: SourceMicrosite | null;
};

function normalizeText(value?: string | null): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.toLowerCase() === 'nan' || trimmed.toLowerCase() === 'null') return null;
  return trimmed;
}

function normalizeAvailableFor(value?: string | null): string | null {
  const cleaned = normalizeText(value)?.toLowerCase();
  if (!cleaned) return null;
  if (cleaned.includes('girl')) return 'Girls';
  if (cleaned.includes('boy')) return 'Boys';
  if (cleaned.includes('all') || cleaned.includes('any')) return 'Any';
  return normalizeText(value);
}

async function main() {
  const sourcePath = path.resolve(process.cwd(), '../full_properties.json');
  const raw = await fs.readFile(sourcePath, 'utf-8');
  const parsed = JSON.parse(raw) as { properties?: SourceProperty[] };
  const items = parsed.properties ?? [];

  for (const item of items) {
    const address = [item.address_line_1, item.address_line_2]
      .filter((value) => typeof value === 'string' && value.trim().length > 0)
      .join(', ');

    await prisma.property.upsert({
      where: { sourcePropertyId: item.id },
      create: {
        sourcePropertyId: item.id,
        sourcePgId: item.pg_id ?? null,
        sourcePgNumber: item.pg_number ?? null,
        sourceEazypgId: item.eazypg_id ?? null,
        name: item.pg_name?.trim() || 'Untitled Property',
        address: address || 'Address unavailable',
        city: normalizeText(item.city) || 'Unknown',
        state: normalizeText(item.state),
        pincode: normalizeText(item.pincode),
        availableFor: normalizeAvailableFor(item.pg_available_for),
        about: normalizeText(item.microsite_data?.about),
        commonAmenitiesSummary: normalizeText(item.microsite_data?.common_amenities),
        serviceAmenitiesSummary: normalizeText(item.microsite_data?.services_amenities),
        foodAmenitiesSummary: normalizeText(item.microsite_data?.food_amenities),
        imageUrls: (item.images ?? []).map((img) => img.url).filter((url): url is string => Boolean(url)),
        ownerId: null,
      },
      update: {
        sourcePgId: item.pg_id ?? null,
        sourcePgNumber: item.pg_number ?? null,
        sourceEazypgId: item.eazypg_id ?? null,
        name: item.pg_name?.trim() || 'Untitled Property',
        address: address || 'Address unavailable',
        city: normalizeText(item.city) || 'Unknown',
        state: normalizeText(item.state),
        pincode: normalizeText(item.pincode),
        availableFor: normalizeAvailableFor(item.pg_available_for),
        about: normalizeText(item.microsite_data?.about),
        commonAmenitiesSummary: normalizeText(item.microsite_data?.common_amenities),
        serviceAmenitiesSummary: normalizeText(item.microsite_data?.services_amenities),
        foodAmenitiesSummary: normalizeText(item.microsite_data?.food_amenities),
        imageUrls: (item.images ?? []).map((img) => img.url).filter((url): url is string => Boolean(url)),
      },
    });
  }

  // eslint-disable-next-line no-console
  console.log(`Synced ${items.length} marketplace properties.`);
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

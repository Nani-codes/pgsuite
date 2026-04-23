import prisma from '../config/db.js';
import { geocodeAddress } from '../utils/geocoding.js';

function normalize(value?: string | null): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed || trimmed.toLowerCase() === 'nan' || trimmed.toLowerCase() === 'null') return undefined;
  return trimmed;
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function dedupe(values: string[]): string[] {
  return [...new Set(values)];
}

function buildCandidateQueries(item: {
  address: string;
  city: string;
  state: string | null;
  pincode: string | null;
}): string[] {
  const address = normalize(item.address);
  const city = normalize(item.city);
  const state = normalize(item.state);
  const pincode = normalize(item.pincode);

  const candidates: string[] = [];

  const full = [address, city, state, pincode].filter(Boolean).join(', ');
  if (full) candidates.push(full);

  const withoutAddress = [city, state, pincode].filter(Boolean).join(', ');
  if (withoutAddress) candidates.push(withoutAddress);

  const cityPincode = [city, pincode].filter(Boolean).join(', ');
  if (cityPincode) candidates.push(cityPincode);

  const cityState = [city, state].filter(Boolean).join(', ');
  if (cityState) candidates.push(cityState);

  if (pincode) candidates.push(pincode);

  return dedupe(candidates);
}

async function main() {
  const batchSize = Number(process.env.GEOCODE_BATCH_SIZE ?? 300);
  const delayMs = Number(process.env.GEOCODE_DELAY_MS ?? 1000);
  const maxLoops = Number(process.env.GEOCODE_MAX_LOOPS ?? 20);

  const queryCache = new Map<string, { latitude: number; longitude: number } | null>();
  const failedIds = new Set<string>();
  let updated = 0;
  let processed = 0;

  for (let loop = 0; loop < maxLoops; loop += 1) {
    const targets = await prisma.property.findMany({
      where: {
        deletedAt: null,
        OR: [{ latitude: null }, { longitude: null }],
        ...(failedIds.size > 0 ? { id: { notIn: [...failedIds] } } : {}),
      },
      select: {
        id: true,
        address: true,
        city: true,
        state: true,
        pincode: true,
      },
      take: batchSize,
      orderBy: [{ updatedAt: 'desc' }],
    });

    if (targets.length === 0) break;

    for (const item of targets) {
      processed += 1;
      const candidates = buildCandidateQueries(item);
      if (candidates.length === 0) {
        failedIds.add(item.id);
        continue;
      }

      let coords: { latitude: number; longitude: number } | null = null;
      for (const candidate of candidates) {
        if (queryCache.has(candidate)) {
          coords = queryCache.get(candidate) ?? null;
        } else {
          coords = await geocodeAddress(candidate);
          queryCache.set(candidate, coords);
          await sleep(delayMs);
        }

        if (coords) break;
      }

      if (!coords) {
        failedIds.add(item.id);
        continue;
      }

      await prisma.property.update({
        where: { id: item.id },
        data: {
          latitude: coords.latitude,
          longitude: coords.longitude,
        },
      });
      updated += 1;
    }
  }

  const remaining = await prisma.property.count({
    where: {
      deletedAt: null,
      OR: [{ latitude: null }, { longitude: null }],
    },
  });

  // eslint-disable-next-line no-console
  console.log(
    `Geocoding backfill complete. Updated ${updated} properties, processed ${processed}, remaining ungeocoded ${remaining}.`,
  );
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

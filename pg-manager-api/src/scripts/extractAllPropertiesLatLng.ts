import fs from 'node:fs/promises';
import path from 'node:path';
import prisma from '../config/db.js';

type MicrositeLink = {
  prop_id?: string | null;
  url?: string | null;
};

type PropertyRecord = {
  property_id: string;
  pg_id?: string | null;
  eazypg_id?: string | null;
  pg_name?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  microsite_url?: MicrositeLink[] | null;
};

type RootData = {
  total_properties: number;
  properties: PropertyRecord[];
};

type ResolveSource = 'api' | 'next_data' | 'none';

type ResolveResult = {
  latitude: number | null;
  longitude: number | null;
  source: ResolveSource;
  lookup_key: string | null;
  error?: string;
};

const RENTOK_API = 'https://apiv2.rentok.com/property/fetchPropertyAllDetails';
const RENTOK_WEB_BASE = 'https://rentok.com/property/';

function normalizeNumber(value: unknown): number | null {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return numeric;
}

function normalizeLatitude(value: unknown): number | null {
  const numeric = normalizeNumber(value);
  if (numeric === null) return null;
  if (numeric < -90 || numeric > 90) return null;
  return numeric;
}

function normalizeLongitude(value: unknown): number | null {
  const numeric = normalizeNumber(value);
  if (numeric === null) return null;
  if (numeric < -180 || numeric > 180) return null;
  return numeric;
}

function extractSlug(item: PropertyRecord): string | null {
  const links = item.microsite_url ?? [];
  for (const link of links) {
    const propId = link.prop_id?.trim();
    if (propId) return propId;
  }
  return null;
}

async function fetchApiBySlug(slug: string): Promise<{ latitude: number; longitude: number } | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6_000);

  try {
    const res = await fetch(RENTOK_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ slug }),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const json = await res.json() as any;
    const basic = json?.data?.basicPgData ?? json?.basicPgData ?? json?.property ?? null;
    if (!basic) return null;

    const latitude = normalizeLatitude(basic.latitude ?? basic.lat);
    const longitude = normalizeLongitude(basic.longitude ?? basic.long);
    if (latitude === null || longitude === null) return null;
    return { latitude, longitude };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchNextDataBySlug(slug: string): Promise<{ latitude: number; longitude: number } | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6_000);

  try {
    const res = await fetch(`${RENTOK_WEB_BASE}${encodeURIComponent(slug)}`, {
      method: 'GET',
      headers: { Accept: 'text/html' },
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const html = await res.text();
    const marker = '<script id="__NEXT_DATA__" type="application/json">';
    const start = html.indexOf(marker);
    if (start === -1) return null;
    const from = start + marker.length;
    const end = html.indexOf('</script>', from);
    if (end === -1) return null;
    const raw = html.slice(from, end);
    const nextData = JSON.parse(raw) as any;
    const basic = nextData?.props?.pageProps?.basicPgData;
    if (!basic) return null;

    const latitude = normalizeLatitude(basic.latitude ?? basic.lat);
    const longitude = normalizeLongitude(basic.longitude ?? basic.long);
    if (latitude === null || longitude === null) return null;
    return { latitude, longitude };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function resolveCoordinates(item: PropertyRecord, delayMs: number): Promise<ResolveResult> {
  const slug = extractSlug(item);
  if (!slug) {
    return {
      latitude: null,
      longitude: null,
      source: 'none',
      lookup_key: null,
      error: 'missing_prop_id',
    };
  }

  const apiCoords = await fetchApiBySlug(slug);
  if (apiCoords) {
    return {
      latitude: apiCoords.latitude,
      longitude: apiCoords.longitude,
      source: 'api',
      lookup_key: slug,
    };
  }

  await new Promise((resolve) => setTimeout(resolve, delayMs));
  const nextCoords = await fetchNextDataBySlug(slug);
  if (nextCoords) {
    return {
      latitude: nextCoords.latitude,
      longitude: nextCoords.longitude,
      source: 'next_data',
      lookup_key: slug,
    };
  }

  return {
    latitude: null,
    longitude: null,
    source: 'none',
    lookup_key: slug,
    error: 'no_coordinates_found',
  };
}

async function main() {
  const delayMs = Number(process.env.LATLNG_DELAY_MS ?? 150);
  const concurrency = Number(process.env.LATLNG_CONCURRENCY ?? 8);
  const inputCandidates = [
    path.resolve(process.cwd(), '../all_properties.json'),
    path.resolve(process.cwd(), 'all_properties.json'),
    path.resolve(process.cwd(), '../../all_properties.json'),
  ];

  let inputPath: string | null = null;
  for (const candidate of inputCandidates) {
    try {
      await fs.access(candidate);
      inputPath = candidate;
      break;
    } catch {
      // continue
    }
  }
  if (!inputPath) {
    throw new Error('Could not locate all_properties.json');
  }

  const outputPath = path.resolve(path.dirname(inputPath), 'all_properties_with_latlng.json');
  const raw = await fs.readFile(inputPath, 'utf-8');
  const parsed = JSON.parse(raw) as RootData;

  const results: Array<PropertyRecord & { latitude: number | null; longitude: number | null; source: ResolveSource; lookup_key: string | null; error?: string }> = [];
  const unresolved: Array<{ property_id: string; lookup_key: string | null; error?: string }> = [];
  let success = 0;
  let cursor = 0;
  let processed = 0;

  const workers = Array.from({ length: Math.max(1, concurrency) }, async () => {
    while (true) {
      const i = cursor;
      cursor += 1;
      if (i >= parsed.properties.length) break;

      const item = parsed.properties[i];
      const resolved = await resolveCoordinates(item, delayMs);
      if (resolved.latitude !== null && resolved.longitude !== null) {
        success += 1;
        await prisma.property.updateMany({
          where: { sourcePropertyId: item.property_id },
          data: {
            latitude: resolved.latitude,
            longitude: resolved.longitude,
          },
        });
      } else {
        unresolved.push({
          property_id: item.property_id,
          lookup_key: resolved.lookup_key,
          error: resolved.error,
        });
      }

      results[i] = {
        ...item,
        latitude: resolved.latitude,
        longitude: resolved.longitude,
        source: resolved.source,
        lookup_key: resolved.lookup_key,
        ...(resolved.error ? { error: resolved.error } : {}),
      };

      processed += 1;
      if (processed % 100 === 0) {
        // eslint-disable-next-line no-console
        console.log(`Processed ${processed}/${parsed.properties.length}...`);
      }
    }
  });
  await Promise.all(workers);

  const out: RootData & {
    extraction_summary: {
      total: number;
      success: number;
      unresolved: number;
    };
    unresolved: Array<{ property_id: string; lookup_key: string | null; error?: string }>;
    properties: Array<PropertyRecord & { latitude: number | null; longitude: number | null; source: ResolveSource; lookup_key: string | null; error?: string }>;
  } = {
    total_properties: parsed.total_properties,
    extraction_summary: {
      total: parsed.properties.length,
      success,
      unresolved: unresolved.length,
    },
    unresolved,
    properties: results,
  };

  await fs.writeFile(outputPath, JSON.stringify(out, null, 2), 'utf-8');

  const dbSummary = await prisma.$queryRaw<Array<{ total: bigint; geocoded: bigint; ungeocoded: bigint }>>`
    SELECT
      COUNT(*)::bigint AS total,
      COUNT(*) FILTER (WHERE latitude IS NOT NULL AND longitude IS NOT NULL)::bigint AS geocoded,
      COUNT(*) FILTER (WHERE latitude IS NULL OR longitude IS NULL)::bigint AS ungeocoded
    FROM public.properties
  `;

  // eslint-disable-next-line no-console
  console.log(`Extraction complete. Success ${success}/${parsed.properties.length}.`);
  // eslint-disable-next-line no-console
  console.log(`Output: ${outputPath}`);
  // eslint-disable-next-line no-console
  console.log(`DB summary:`, {
    total: Number(dbSummary[0]?.total ?? 0n),
    geocoded: Number(dbSummary[0]?.geocoded ?? 0n),
    ungeocoded: Number(dbSummary[0]?.ungeocoded ?? 0n),
  });
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

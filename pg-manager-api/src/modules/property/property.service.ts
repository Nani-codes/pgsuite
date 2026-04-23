import { PropertyRepository } from './property.repository.js';
import { ForbiddenError, NotFoundError } from '../../utils/errors.js';
import type { CreatePropertyInput, UpdatePropertyInput, CreateRoomInput, CreateFloorInput } from './property.schema.js';
import { geocodeAddress } from '../../utils/geocoding.js';

const repo = new PropertyRepository();

export class PropertyService {
  async listPublicProperties(query: {
    q?: string;
    city?: string;
    state?: string;
    pincode?: string;
    availableFor?: string;
    hasImages?: boolean | string;
    hasAbout?: boolean | string;
    lat?: number | string;
    lng?: number | string;
    radiusKm?: number | string;
    sort?: string;
    limit?: number | string;
    offset?: number | string;
  }) {
    const limit = Math.min(Math.max(Number(query.limit ?? 20), 1), 50);
    const offset = Math.max(Number(query.offset ?? 0), 0);
    const normalizedAvailableFor = this.normalizeAvailableFor(query.availableFor);
    const lat = this.parseNumber(query.lat);
    const lng = this.parseNumber(query.lng);
    const radiusKm = this.parseNumber(query.radiusKm);
    const result = await repo.findPublic({
      q: query.q?.trim() || undefined,
      city: this.normalizeText(query.city),
      state: this.normalizeText(query.state),
      pincode: this.normalizeText(query.pincode),
      availableFor: normalizedAvailableFor,
      hasImages: this.parseBoolean(query.hasImages),
      hasAbout: this.parseBoolean(query.hasAbout),
      lat,
      lng,
      radiusKm,
      sort: query.sort === 'distance' ? 'distance' : 'updated',
      limit,
      offset,
    });

    return {
      items: result.items.map((item) => {
        const normalized = {
          ...item,
          city: this.normalizeText(item.city) ?? item.city,
          state: this.normalizeText(item.state) ?? undefined,
          availableFor: this.normalizeAvailableForLabel(item.availableFor),
          imageUrls: this.extractImageUrls(item.imageUrls),
        } as Record<string, unknown>;
        if ('latitude' in normalized) delete normalized.latitude;
        if ('longitude' in normalized) delete normalized.longitude;
        return normalized;
      }),
      total: result.total,
      limit,
      offset,
    };
  }

  async getPublicProperty(id: string) {
    const property = await repo.findPublicById(id);
    if (!property) throw new NotFoundError('Property not found');
    return {
      ...property,
      imageUrls: this.extractImageUrls(property.imageUrls),
    };
  }

  async listProperties(ownerId: string) {
    return repo.findAllByOwner(ownerId);
  }

  async getProperty(id: string, ownerId: string) {
    const property = await repo.findById(id, ownerId);
    if (!property) throw new NotFoundError('Property not found');
    return property;
  }

  async createProperty(ownerId: string, data: CreatePropertyInput) {
    const geocoded = await this.geocodeForPayload(data);
    return repo.create(ownerId, {
      ...data,
      ...(geocoded ?? {}),
    });
  }

  async updateProperty(id: string, ownerId: string, data: UpdatePropertyInput) {
    const existing = await repo.findById(id, ownerId);
    if (!existing) throw new NotFoundError('Property not found');

    const shouldReGeocode = data.address !== undefined
      || data.city !== undefined
      || data.state !== undefined
      || data.pincode !== undefined;

    let geocoded: { latitude?: number; longitude?: number } = {};
    if (shouldReGeocode) {
      const target = {
        address: data.address ?? existing.address,
        city: data.city ?? existing.city,
        state: data.state ?? existing.state ?? undefined,
        pincode: data.pincode ?? existing.pincode ?? undefined,
      };
      geocoded = (await this.geocodeForPayload(target)) ?? {};
    }

    const result = await repo.update(id, ownerId, {
      ...data,
      ...geocoded,
    });
    if (result.count === 0) throw new NotFoundError('Property not found');
    return repo.findById(id, ownerId);
  }

  async deleteProperty(id: string, ownerId: string) {
    const result = await repo.softDelete(id, ownerId);
    if (result.count === 0) throw new NotFoundError('Property not found');
  }

  async createFloor(propertyId: string, ownerId: string, data: CreateFloorInput) {
    await this.ensureOwnership(propertyId, ownerId);
    return repo.createFloor(propertyId, data);
  }

  async createRoom(propertyId: string, ownerId: string, data: CreateRoomInput) {
    await this.ensureOwnership(propertyId, ownerId);
    return repo.createRoom(propertyId, data);
  }

  async getVacancy(propertyId: string, ownerId: string) {
    await this.ensureOwnership(propertyId, ownerId);
    return repo.getVacancySummary(propertyId);
  }

  async getRooms(propertyId: string, ownerId: string) {
    await this.ensureOwnership(propertyId, ownerId);
    return repo.getRoomsByProperty(propertyId);
  }

  private async ensureOwnership(propertyId: string, ownerId: string) {
    const property = await repo.findById(propertyId, ownerId);
    if (!property) throw new ForbiddenError();
  }

  private extractImageUrls(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value.filter((entry): entry is string => typeof entry === 'string');
  }

  private normalizeText(value?: string | null): string | undefined {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    if (trimmed.toLowerCase() === 'nan' || trimmed.toLowerCase() === 'null') return undefined;
    return trimmed;
  }

  private normalizeAvailableFor(value?: string | null): 'boys' | 'girls' | 'any' | undefined {
    const cleaned = this.normalizeText(value)?.toLowerCase();
    if (!cleaned) return undefined;
    if (cleaned.includes('girl')) return 'girls';
    if (cleaned.includes('boy')) return 'boys';
    if (cleaned.includes('all') || cleaned.includes('any')) return 'any';
    return undefined;
  }

  private normalizeAvailableForLabel(value?: string | null): string | undefined {
    const normalized = this.normalizeAvailableFor(value);
    if (normalized === 'girls') return 'Girls';
    if (normalized === 'boys') return 'Boys';
    if (normalized === 'any') return 'Any';
    return this.normalizeText(value);
  }

  private parseBoolean(value?: boolean | string): boolean | undefined {
    if (typeof value === 'boolean') return value;
    if (typeof value !== 'string') return undefined;
    if (value === 'true') return true;
    if (value === 'false') return false;
    return undefined;
  }

  private parseNumber(value?: number | string): number | undefined {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim().length > 0) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
    return undefined;
  }

  private async geocodeForPayload(data: {
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
  }): Promise<{ latitude: number; longitude: number } | null> {
    const addressParts = [
      this.normalizeText(data.address),
      this.normalizeText(data.city),
      this.normalizeText(data.state),
      this.normalizeText(data.pincode),
    ].filter(Boolean) as string[];
    if (addressParts.length === 0) return null;
    return geocodeAddress(addressParts.join(', '));
  }
}

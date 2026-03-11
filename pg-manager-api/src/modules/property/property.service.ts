import { PropertyRepository } from './property.repository.js';
import { ForbiddenError, NotFoundError } from '../../utils/errors.js';
import type { CreatePropertyInput, UpdatePropertyInput, CreateRoomInput, CreateFloorInput } from './property.schema.js';

const repo = new PropertyRepository();

export class PropertyService {
  async listProperties(ownerId: string) {
    return repo.findAllByOwner(ownerId);
  }

  async getProperty(id: string, ownerId: string) {
    const property = await repo.findById(id, ownerId);
    if (!property) throw new NotFoundError('Property not found');
    return property;
  }

  async createProperty(ownerId: string, data: CreatePropertyInput) {
    return repo.create(ownerId, data);
  }

  async updateProperty(id: string, ownerId: string, data: UpdatePropertyInput) {
    const result = await repo.update(id, ownerId, data);
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
}

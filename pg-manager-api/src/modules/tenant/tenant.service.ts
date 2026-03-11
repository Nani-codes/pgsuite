import { TenantRepository } from './tenant.repository.js';
import { NotFoundError } from '../../utils/errors.js';
import type { CreateTenantInput, UpdateTenantInput } from './tenant.schema.js';

const repo = new TenantRepository();

export class TenantService {
  async listTenants(ownerId: string) {
    return repo.findAllByOwner(ownerId);
  }

  async getTenant(id: string, ownerId: string) {
    const tenant = await repo.findById(id, ownerId);
    if (!tenant) throw new NotFoundError('Tenant not found');
    return tenant;
  }

  async createTenant(ownerId: string, data: CreateTenantInput) {
    return repo.createWithLease(ownerId, data);
  }

  async updateTenant(id: string, ownerId: string, data: UpdateTenantInput) {
    const result = await repo.update(id, ownerId, data);
    if (result.count === 0) throw new NotFoundError('Tenant not found');
    return repo.findById(id, ownerId);
  }

  async deleteTenant(id: string, ownerId: string) {
    const result = await repo.softDelete(id, ownerId);
    if (result.count === 0) throw new NotFoundError('Tenant not found');
  }
}

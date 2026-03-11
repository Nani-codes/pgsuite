import type { Request, Response } from 'express';
import { TenantService } from './tenant.service.js';

const service = new TenantService();

function paramId(req: Request): string {
  return req.params.id as string;
}

export class TenantController {
  async list(req: Request, res: Response) {
    const tenants = await service.listTenants(req.user!.sub);
    res.json({ success: true, data: tenants });
  }

  async get(req: Request, res: Response) {
    const tenant = await service.getTenant(paramId(req), req.user!.sub);
    res.json({ success: true, data: tenant });
  }

  async create(req: Request, res: Response) {
    const result = await service.createTenant(req.user!.sub, req.body);
    res.status(201).json({ success: true, data: result });
  }

  async update(req: Request, res: Response) {
    const tenant = await service.updateTenant(paramId(req), req.user!.sub, req.body);
    res.json({ success: true, data: tenant });
  }

  async delete(req: Request, res: Response) {
    await service.deleteTenant(paramId(req), req.user!.sub);
    res.json({ success: true, message: 'Tenant deleted' });
  }
}

import type { Request, Response } from 'express';
import { PropertyService } from './property.service.js';

const service = new PropertyService();

function paramId(req: Request): string {
  return req.params.id as string;
}

export class PropertyController {
  async list(req: Request, res: Response) {
    const properties = await service.listProperties(req.user!.sub);
    res.json({ success: true, data: properties });
  }

  async get(req: Request, res: Response) {
    const property = await service.getProperty(paramId(req), req.user!.sub);
    res.json({ success: true, data: property });
  }

  async create(req: Request, res: Response) {
    const property = await service.createProperty(req.user!.sub, req.body);
    res.status(201).json({ success: true, data: property });
  }

  async update(req: Request, res: Response) {
    const property = await service.updateProperty(paramId(req), req.user!.sub, req.body);
    res.json({ success: true, data: property });
  }

  async delete(req: Request, res: Response) {
    await service.deleteProperty(paramId(req), req.user!.sub);
    res.json({ success: true, message: 'Property deleted' });
  }

  async createFloor(req: Request, res: Response) {
    const floor = await service.createFloor(paramId(req), req.user!.sub, req.body);
    res.status(201).json({ success: true, data: floor });
  }

  async createRoom(req: Request, res: Response) {
    const room = await service.createRoom(paramId(req), req.user!.sub, req.body);
    res.status(201).json({ success: true, data: room });
  }

  async getVacancy(req: Request, res: Response) {
    const vacancy = await service.getVacancy(paramId(req), req.user!.sub);
    res.json({ success: true, data: vacancy });
  }

  async getRooms(req: Request, res: Response) {
    const rooms = await service.getRooms(paramId(req), req.user!.sub);
    res.json({ success: true, data: rooms });
  }
}

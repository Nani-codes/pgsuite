import type { Request, Response } from 'express';
import { PropertyService } from './property.service.js';

const service = new PropertyService();

function paramId(req: Request): string {
  return req.params.id as string;
}

export class PropertyController {
  async listPublic(req: Request, res: Response) {
    const data = await service.listPublicProperties({
      q: req.query.q as string | undefined,
      city: req.query.city as string | undefined,
      state: req.query.state as string | undefined,
      pincode: req.query.pincode as string | undefined,
      availableFor: req.query.availableFor as string | undefined,
      hasImages: req.query.hasImages as string | undefined,
      hasAbout: req.query.hasAbout as string | undefined,
      lat: req.query.lat as string | undefined,
      lng: req.query.lng as string | undefined,
      radiusKm: req.query.radiusKm as string | undefined,
      sort: req.query.sort as string | undefined,
      limit: req.query.limit as string | undefined,
      offset: req.query.offset as string | undefined,
    });
    res.json({ success: true, data });
  }

  async getPublic(req: Request, res: Response) {
    const property = await service.getPublicProperty(paramId(req));
    res.json({ success: true, data: property });
  }

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

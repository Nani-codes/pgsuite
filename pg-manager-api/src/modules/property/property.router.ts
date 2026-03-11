import { Router } from 'express';
import { PropertyController } from './property.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import { createPropertySchema, updatePropertySchema, createRoomSchema, createFloorSchema } from './property.schema.js';

const router = Router();
const ctrl = new PropertyController();

router.use(authenticate);
router.use(authorize('owner'));

router.get('/', (req, res, next) => { ctrl.list(req, res).catch(next); });
router.post('/', validate(createPropertySchema), (req, res, next) => { ctrl.create(req, res).catch(next); });
router.get('/:id', (req, res, next) => { ctrl.get(req, res).catch(next); });
router.put('/:id', validate(updatePropertySchema), (req, res, next) => { ctrl.update(req, res).catch(next); });
router.delete('/:id', (req, res, next) => { ctrl.delete(req, res).catch(next); });

router.get('/:id/vacancy', (req, res, next) => { ctrl.getVacancy(req, res).catch(next); });
router.get('/:id/rooms', (req, res, next) => { ctrl.getRooms(req, res).catch(next); });
router.post('/:id/rooms', validate(createRoomSchema), (req, res, next) => { ctrl.createRoom(req, res).catch(next); });
router.post('/:id/floors', validate(createFloorSchema), (req, res, next) => { ctrl.createFloor(req, res).catch(next); });

export default router;

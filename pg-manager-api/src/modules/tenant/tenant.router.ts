import { Router } from 'express';
import { TenantController } from './tenant.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import { createTenantSchema, updateTenantSchema } from './tenant.schema.js';

const router = Router();
const ctrl = new TenantController();

router.use(authenticate);
router.use(authorize('owner'));

router.get('/', (req, res, next) => { ctrl.list(req, res).catch(next); });
router.post('/', validate(createTenantSchema), (req, res, next) => { ctrl.create(req, res).catch(next); });
router.get('/:id', (req, res, next) => { ctrl.get(req, res).catch(next); });
router.put('/:id', validate(updateTenantSchema), (req, res, next) => { ctrl.update(req, res).catch(next); });
router.delete('/:id', (req, res, next) => { ctrl.delete(req, res).catch(next); });

export default router;

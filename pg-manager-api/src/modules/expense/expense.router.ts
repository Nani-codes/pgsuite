import { Router } from 'express';
import { z } from 'zod/v4';
import { authenticate } from '../../middleware/authenticate.js';
import prisma from '../../config/db.js';

const router = Router();

router.use(authenticate);

const createExpenseSchema = z.object({
  propertyId: z.string().uuid(),
  category: z.string(),
  amount: z.number().positive(),
  description: z.string(),
  date: z.string().optional(),
});

router.get('/', async (req, res, next) => {
  try {
    const expenses = await prisma.expense.findMany({
      where: { property: { ownerId: req.user!.sub } },
      include: { property: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: expenses });
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const data = createExpenseSchema.parse(req.body);
    const property = await prisma.property.findFirst({
      where: { id: data.propertyId, ownerId: req.user!.sub },
    });
    if (!property) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Property not found' } });
      return;
    }

    const expense = await prisma.expense.create({
      data: {
        propertyId: data.propertyId,
        category: data.category,
        amount: data.amount,
        description: data.description,
        date: data.date ? new Date(data.date) : new Date(),
      },
    });
    res.status(201).json({ success: true, data: expense });
  } catch (err) { next(err); }
});

export default router;
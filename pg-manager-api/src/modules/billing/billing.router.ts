import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import prisma from '../../config/db.js';

const router = Router();

router.use(authenticate);

router.get('/invoices', async (req, res, next) => {
  try {
    const invoices = await prisma.invoice.findMany({
      where: {
        property: { ownerId: req.user!.sub },
      },
      include: { tenant: true, items: true, payments: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: invoices });
  } catch (err) { next(err); }
});

router.get('/invoices/:id', async (req, res, next) => {
  try {
    const invoice = await prisma.invoice.findFirst({
      where: {
        id: req.params.id,
        property: { ownerId: req.user!.sub },
      },
      include: { tenant: true, items: true, payments: true, lease: true },
    });
    if (!invoice) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Invoice not found' } });
      return;
    }
    res.json({ success: true, data: invoice });
  } catch (err) { next(err); }
});

export default router;

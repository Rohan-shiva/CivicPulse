import { Router } from 'express';
import { municipalController } from '../controllers/municipal.controller';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

// Enforce role-based access control: only officers and admins can access municipal routes
router.use(requireAuth, requireRole(['officer', 'admin']));

router.get('/incidents', (req, res, next) =>
  municipalController.getIncidents(req, res, next)
);

router.get('/incidents/:incidentId', (req, res, next) =>
  municipalController.getIncidentById(req, res, next)
);

router.patch('/incidents/:incidentId/status', (req, res, next) =>
  municipalController.updateStatus(req, res, next)
);

export default router;

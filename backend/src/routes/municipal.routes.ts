import { Router } from 'express';
import { municipalController } from '../controllers/municipal.controller';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

// Enforce role-based access control: only officers and admins can access municipal routes
router.use(requireAuth, requireRole(['officer', 'admin']));

// Dashboard aggregations & analytics
router.get('/dashboard', (req, res, next) => municipalController.getDashboard(req, res, next));

// Geospatial incident map (GeoJSON)
router.get('/incidents/map', (req, res, next) =>
  municipalController.getIncidentMap(req, res, next)
);

// Incident priority queue
router.get('/incidents', (req, res, next) => municipalController.getIncidents(req, res, next));

// Incident detail
router.get('/incidents/:incidentId', (req, res, next) =>
  municipalController.getIncidentById(req, res, next)
);

// Status update
router.patch('/incidents/:incidentId/status', (req, res, next) =>
  municipalController.updateStatus(req, res, next)
);

export default router;

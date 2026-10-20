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

// Assign field workers to incident -> create WorkOrder
router.post('/incidents/:incidentId/assign', (req, res, next) =>
  municipalController.assignWorkers(req, res, next)
);

// Duplicate review (merge or dismiss)
router.post('/incidents/:incidentId/duplicate-review', (req, res, next) =>
  municipalController.reviewDuplicate(req, res, next)
);

// Available field workers list
router.get('/field-workers', (req, res, next) =>
  municipalController.getFieldWorkers(req, res, next)
);

// Verification queue
router.get('/verifications', (req, res, next) =>
  municipalController.getVerificationQueue(req, res, next)
);

// Verify resolution (approve)
router.post('/work-orders/:workOrderId/verify', (req, res, next) =>
  municipalController.verifyResolution(req, res, next)
);

// Reject resolution (rework)
router.post('/work-orders/:workOrderId/reject', (req, res, next) =>
  municipalController.rejectResolution(req, res, next)
);

export default router;

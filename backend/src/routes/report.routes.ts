import { Router } from 'express';
import { reportController } from '../controllers/report.controller';
import { requireAuth } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = Router();

router.post('/', requireAuth, upload.single('photo'), (req, res, next) =>
  reportController.submitReport(req, res, next)
);

router.get('/my', requireAuth, (req, res, next) =>
  reportController.getMyReports(req, res, next)
);

router.get('/:complaintId', requireAuth, (req, res, next) =>
  reportController.getReportByComplaintId(req, res, next)
);

router.get('/:complaintId/pdf', (req, res, next) =>
  reportController.downloadPdf(req, res, next)
);

export default router;

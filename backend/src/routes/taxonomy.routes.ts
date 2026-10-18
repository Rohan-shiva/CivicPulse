import { Router } from 'express';
import { taxonomyController } from '../controllers/taxonomy.controller';

const router = Router();

router.get('/departments', (req, res, next) =>
  taxonomyController.getDepartments(req, res, next)
);

router.get('/issue-categories', (req, res, next) =>
  taxonomyController.getCategories(req, res, next)
);

export default router;

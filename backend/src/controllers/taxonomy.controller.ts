import { Request, Response, NextFunction } from 'express';
import { Department } from '../models/Department';
import { IssueCategory } from '../models/IssueCategory';

export class TaxonomyController {
  async getDepartments(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const departments = await Department.find({ isActive: true }).sort({ name: 1 });
      res.status(200).json({ success: true, count: departments.length, departments });
    } catch (error) {
      next(error);
    }
  }

  async getCategories(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const categories = await IssueCategory.find({ isActive: true }).sort({ name: 1 });
      res.status(200).json({ success: true, count: categories.length, categories });
    } catch (error) {
      next(error);
    }
  }
}

export const taxonomyController = new TaxonomyController();

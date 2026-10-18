import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.post('/send-otp', (req, res, next) => authController.sendOtp(req, res, next));
router.post('/verify-otp', (req, res, next) => authController.verifyOtp(req, res, next));
router.post('/refresh', (req, res, next) => authController.refreshToken(req, res, next));
router.post('/logout', (req, res) => authController.logout(req, res));
router.get('/me', requireAuth, (req, res, next) => authController.getMe(req, res, next));

export default router;

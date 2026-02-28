import { Router } from 'express';
import { AuthController } from '@/controllers/AuthController';
import { AuthService } from '@/services/AuthService';
import { AuthRepository } from '@/repositories/AuthRepository';
import { asyncErrorWrapper } from '@/middleware/asyncErrorWrapper';

const router = Router();

// Dependecy Injection Wiring
const authRepository = new AuthRepository();
const authService = new AuthService(authRepository);
const authController = new AuthController(authService);

router.post(
    '/register',
    asyncErrorWrapper((req, res) => authController.register(req, res))
);

router.post(
    '/register-seller',
    asyncErrorWrapper((req, res) => authController.registerSeller(req, res))
);

router.post(
    '/login',
    asyncErrorWrapper((req, res) => authController.login(req, res))
);

router.post(
    '/logout',
    asyncErrorWrapper((req, res) => authController.logout(req, res))
);

export default router;

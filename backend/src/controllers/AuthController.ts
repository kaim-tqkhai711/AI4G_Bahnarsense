import { Request, Response } from 'express';
import { BaseController } from './BaseController';
import { AuthService } from '@/services/AuthService';
import { registerSchema, loginSchema, registerSellerSchema } from '@/validators/auth.schema';

export class AuthController extends BaseController {
    constructor(private readonly authService: AuthService) {
        super();
    }

    async register(req: Request, res: Response): Promise<void> {
        try {
            const { email, password } = registerSchema.parse(req.body);
            const data = await this.authService.register(email, password, 'student');
            this.handleSuccess(res, data, 201);
        } catch (error) {
            this.handleError(error, res, 'AuthController.register');
        }
    }

    async registerSeller(req: Request, res: Response): Promise<void> {
        try {
            const { email, password, shop_name } = registerSellerSchema.parse(req.body);
            const data = await this.authService.register(email, password, 'seller', shop_name);
            this.handleSuccess(res, data, 201);
        } catch (error) {
            this.handleError(error, res, 'AuthController.registerSeller');
        }
    }

    async login(req: Request, res: Response): Promise<void> {
        try {
            const { token } = req.body;
            if (!token) {
                this.handleError(new Error('Missing token in request body'), res, 'AuthController.login');
                return;
            }

            const data = await this.authService.verifyLoginToken(token);

            this.handleSuccess(res, data, 200);
        } catch (error) {
            this.handleError(error, res, 'AuthController.login');
        }
    }

    async logout(req: Request, res: Response): Promise<void> {
        try {
            this.handleSuccess(res, { message: 'Đăng xuất thành công. Hãy clear token ở Client.' });
        } catch (error) {
            this.handleError(error, res, 'AuthController.logout');
        }
    }
}

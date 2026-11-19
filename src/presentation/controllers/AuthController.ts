import type { Request, Response } from 'express';
import type { LoginUseCase } from '../../application/auth/LoginUseCase';
import type { RegisterUserUseCase } from '../../application/auth/RegisterUserUseCase';
import type { LoginBody, RegisterBody } from '../schemas/authSchemas';

export class AuthController {
  constructor(
    private readonly loginUseCase: LoginUseCase,
    private readonly registerUseCase: RegisterUserUseCase,
  ) {}

  login = async (req: Request<unknown, unknown, LoginBody>, res: Response) => {
    const result = await this.loginUseCase.execute(req.body);
    res.json(result);
  };

  register = async (req: Request<unknown, unknown, RegisterBody>, res: Response) => {
    const result = await this.registerUseCase.execute(req.body);
    res.status(201).json(result);
  };
}

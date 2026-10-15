import type { Request, Response } from 'express';
import type { LoginUseCase } from '../../application/auth/LoginUseCase';
import type { LoginBody } from '../schemas/authSchemas';

export class AuthController {
  constructor(private readonly loginUseCase: LoginUseCase) {}

  login = async (req: Request<unknown, unknown, LoginBody>, res: Response) => {
    const result = await this.loginUseCase.execute(req.body);
    res.json(result);
  };
}

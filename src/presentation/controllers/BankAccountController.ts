import type { Request, Response } from 'express';
import type { BankAccountUseCases } from '../../application/bankAccounts';
import type { CreateBankAccountBody, UpdateBankAccountBody } from '../schemas/bankAccountSchemas';
import type { IdParams } from '../schemas/commonSchemas';

// Every route runs behind the auth middleware, so req.user is always set.
export class BankAccountController {
  constructor(private readonly useCases: BankAccountUseCases) {}

  list = async (req: Request, res: Response) => {
    res.json(await this.useCases.list.execute(req.user!.id));
  };

  get = async (req: Request<IdParams>, res: Response) => {
    res.json(await this.useCases.get.execute(req.params.id, req.user!.id));
  };

  create = async (req: Request<unknown, unknown, CreateBankAccountBody>, res: Response) => {
    res.status(201).json(await this.useCases.create.execute(req.body, req.user!.id));
  };

  update = async (req: Request<IdParams, unknown, UpdateBankAccountBody>, res: Response) => {
    res.json(await this.useCases.update.execute(req.params.id, req.body, req.user!.id));
  };

  delete = async (req: Request<IdParams>, res: Response) => {
    await this.useCases.delete.execute(req.params.id, req.user!.id);
    res.status(200).json({ message: "Cuenta bancaria eliminada con éxito" });
  };
}

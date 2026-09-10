import { Request } from 'express';

export interface RequestWithId extends Request {
  id?: string;
  rawBody?: Buffer;
}

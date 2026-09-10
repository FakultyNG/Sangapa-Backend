import { RequestWithId } from './request-with-id';

export type AuthenticatedUser = {
  id: string;
  email: string;
  sessionId: string;
  role: 'USER' | 'ADMIN';
};

export interface AuthenticatedRequest extends RequestWithId {
  user: AuthenticatedUser;
}

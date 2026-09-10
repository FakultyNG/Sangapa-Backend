export type JwtPayload = {
  sub: string;
  email: string;
  sessionId: string;
  role: 'USER' | 'ADMIN';
};

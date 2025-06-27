import { Role } from '../types/roles.enum';

export interface JwtPayload {
  sub: number;
  email: string;
  role: Role;
}

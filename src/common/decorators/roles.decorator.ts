import { SetMetadata } from '@nestjs/common';
<<<<<<< HEAD

export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
=======
import { Role } from '../../types/roles.enum';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
>>>>>>> main

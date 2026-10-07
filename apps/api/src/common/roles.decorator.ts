import { SetMetadata, CustomDecorator } from '@nestjs/common';
import { UserRole } from '@prisma/client';

export const ROLES_KEY = 'required_roles';

/** Declares the user roles allowed to invoke a controller or route. */
export function Roles(...roles: UserRole[]): CustomDecorator<typeof ROLES_KEY> {
  return SetMetadata(ROLES_KEY, roles);
}

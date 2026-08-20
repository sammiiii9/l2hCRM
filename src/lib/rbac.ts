import { SessionUser } from "./auth";

/**
 * Checks if a session user has a specific permission or is an Administrator.
 */
export function hasPermission(user: SessionUser | null, permissionSlug: string): boolean {
  if (!user) return false;
  if (user.roleSlug === "ADMIN") return true;
  return user.permissions.includes(permissionSlug);
}

/**
 * Checks if user is an Administrator.
 */
export function isAdmin(user: SessionUser | null): boolean {
  return user?.roleSlug === "ADMIN";
}

/**
 * Generates an ownership filter object for Prisma queries.
 * If user is Admin, returns {} (unrestricted access).
 * If user is Member/Sales Associate, restricts to records assigned to or created by them.
 */
export function getOwnershipFilter(
  user: SessionUser,
  assignedField: string = "assignedToId",
  includeCreatedBy: boolean = false
): any {
  if (isAdmin(user)) {
    return {};
  }
  if (includeCreatedBy) {
    return {
      OR: [
        { [assignedField]: user.id },
        { createdById: user.id },
      ],
    };
  }
  return {
    [assignedField]: user.id,
  };
}

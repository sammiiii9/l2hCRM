import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { prisma } from "./prisma";

const JWT_SECRET = process.env.JWT_SECRET || "l2h_crm_enterprise_super_secret_jwt_key_2026";
const COOKIE_NAME = "l2h_auth_token";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  staffCode: string | null;
  roleId: string;
  roleSlug: string;
  roleName: string;
  teamName: string | null;
  designation: string | null;
  permissions: string[];
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(payload: { userId: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): { userId: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string };
  } catch (error) {
    return null;
  }
}

export async function getCurrentUser(req?: any): Promise<SessionUser | null> {
  try {
    let token: string | undefined;
    if (req && typeof req.cookies?.get === "function") {
      token = req.cookies.get(COOKIE_NAME)?.value;
    }
    if (!token) {
      const cookieStore = cookies();
      token = cookieStore.get(COOKIE_NAME)?.value;
    }
    if (!token) return null;

    const payload = verifyToken(token);
    if (!payload?.userId) return null;

    const user = await prisma.user.findUnique({
      where: { id: payload.userId, isDeleted: false, status: "ACTIVE" },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
        userPermissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (!user) return null;

    // Collect base role permissions
    const permissionsSet = new Set<string>();
    user.role.permissions.forEach((rp) => {
      permissionsSet.add(rp.permission.slug);
    });

    // Apply user-specific overrides
    user.userPermissions.forEach((up) => {
      if (up.isGranted) {
        permissionsSet.add(up.permission.slug);
      } else {
        permissionsSet.delete(up.permission.slug);
      }
    });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      staffCode: user.staffCode,
      roleId: user.roleId,
      roleSlug: user.role.slug,
      roleName: user.role.name,
      teamName: user.teamName,
      designation: user.designation,
      permissions: Array.from(permissionsSet),
    };
  } catch (error: any) {
    if (error?.digest === "DYNAMIC_SERVER_USAGE" || error?.name === "DynamicServerError") {
      throw error;
    }
    console.error("Error in getCurrentUser:", error);
    return null;
  }
}

export const AUTH_COOKIE_OPTIONS = {
  name: COOKIE_NAME,
  options: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: 7 * 24 * 60 * 60, // 7 days
    path: "/",
  },
};

export const getAuthSession = getCurrentUser;

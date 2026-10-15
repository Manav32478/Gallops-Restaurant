import { ApiError } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { getSessionUser, type SessionUser } from '@/lib/auth/session';
import { capabilitiesFor, roleHas, type Capability, type Role } from '@/lib/auth/rbac';

export type TenantContext = {
  user: SessionUser;
  restaurant: { id: string; slug: string; name: string; logoUrl: string | null };
  role: Role;
  capabilities: Capability[];
  can: (capability: Capability) => boolean;
};

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new ApiError(401, 'UNAUTHENTICATED', 'Please sign in to continue.');
  return user;
}

export async function requirePlatformAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (!user.isPlatformAdmin) throw new ApiError(403, 'FORBIDDEN', 'Platform admin access required.');
  return user;
}

/**
 * Resolves a restaurant by slug AND proves the caller is an active member.
 * The restaurant id is always derived from the server-side membership record —
 * never from a client-supplied id.
 */
export async function getTenantContext(slug: string, currentUser?: SessionUser): Promise<TenantContext | null> {
  const user = currentUser ?? (await getSessionUser());
  if (!user) return null;
  const membership = user.memberships.find((m) => m.restaurant.slug === slug);
  if (!membership) return null;
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: membership.restaurantId },
    select: { id: true, slug: true, name: true, logoUrl: true, isActive: true },
  });
  if (!restaurant || !restaurant.isActive) return null;
  const capabilities = capabilitiesFor(membership.role);
  return {
    user,
    restaurant: { id: restaurant.id, slug: restaurant.slug, name: restaurant.name, logoUrl: restaurant.logoUrl },
    role: membership.role,
    capabilities,
    can: (capability: Capability) => roleHas(membership.role, capability),
  };
}

export async function requireTenant(slug: string): Promise<TenantContext> {
  const user = await requireUser();
  const ctx = await getTenantContext(slug, user);
  if (!ctx) throw new ApiError(403, 'FORBIDDEN', 'You do not have access to this restaurant.');
  return ctx;
}

export async function requireCapability(slug: string, capability: Capability): Promise<TenantContext> {
  const ctx = await requireTenant(slug);
  if (!ctx.can(capability)) {
    throw new ApiError(403, 'FORBIDDEN', `Your role (${ctx.role.toLowerCase()}) cannot perform this action.`);
  }
  return ctx;
}

/**
 * Grants access when the role holds AT LEAST ONE of the listed capabilities.
 * Used for endpoints shared between reception and kitchen, where the two roles
 * carry different capability names for the same operational step.
 */
export async function requireAnyCapability(slug: string, capabilities: Capability[]): Promise<TenantContext> {
  const ctx = await requireTenant(slug);
  if (!capabilities.some((capability) => ctx.can(capability))) {
    throw new ApiError(403, 'FORBIDDEN', `Your role (${ctx.role.toLowerCase()}) cannot perform this action.`);
  }
  return ctx;
}

/** Loads a public restaurant by slug for guest-facing pages. */
export async function getPublicRestaurant(slug: string) {
  return prisma.restaurant.findFirst({
    where: { slug, isPublished: true, isActive: true },
  });
}

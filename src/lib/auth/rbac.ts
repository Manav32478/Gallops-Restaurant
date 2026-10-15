export type Role = 'OWNER' | 'MANAGER' | 'RECEPTIONIST' | 'KITCHEN' | 'PLATFORM_ADMIN';

export type Capability =
  | 'orders.view'
  | 'orders.update'
  | 'orders.cancel'
  | 'orders.payment'
  | 'kitchen.view'
  | 'kitchen.update'
  | 'menu.view'
  | 'menu.edit'
  | 'availability.edit'
  | 'categories.edit'
  | 'tables.view'
  | 'tables.edit'
  | 'staff.view'
  | 'staff.edit'
  | 'analytics.view'
  | 'settings.edit'
  | 'billing.view'
  | 'notifications.send';

const OWNER_CAPS: Capability[] = [
  'orders.view',
  'orders.update',
  'orders.cancel',
  'orders.payment',
  'kitchen.view',
  'kitchen.update',
  'menu.view',
  'menu.edit',
  'availability.edit',
  'categories.edit',
  'tables.view',
  'tables.edit',
  'staff.view',
  'staff.edit',
  'analytics.view',
  'settings.edit',
  'billing.view',
  'notifications.send',
];

const MANAGER_CAPS: Capability[] = OWNER_CAPS.filter(
  (c) => c !== 'staff.edit' && c !== 'billing.view' && c !== 'settings.edit',
);

const RECEPTION_CAPS: Capability[] = [
  'orders.view',
  'orders.update',
  'orders.cancel',
  'orders.payment',
  'menu.view',
  'availability.edit',
  'tables.view',
  'notifications.send',
];

const KITCHEN_CAPS: Capability[] = ['kitchen.view', 'kitchen.update', 'menu.view', 'orders.view'];

export function capabilitiesFor(role: Role): Capability[] {
  switch (role) {
    case 'OWNER':
      return OWNER_CAPS;
    case 'MANAGER':
      return MANAGER_CAPS;
    case 'RECEPTIONIST':
      return RECEPTION_CAPS;
    case 'KITCHEN':
      return KITCHEN_CAPS;
    default:
      return [];
  }
}

export function roleHas(role: Role, capability: Capability): boolean {
  return capabilitiesFor(role).includes(capability);
}

export const ROLE_LABEL: Record<Role, string> = {
  OWNER: 'Owner',
  MANAGER: 'Manager',
  RECEPTIONIST: 'Receptionist',
  KITCHEN: 'Kitchen staff',
  PLATFORM_ADMIN: 'Platform admin',
};

export const ROLE_DESCRIPTION: Record<Role, string> = {
  OWNER: 'Full access: menu, orders, tables, staff, settings and billing.',
  MANAGER: 'Operations: orders, kitchen, menu, tables and analytics.',
  RECEPTIONIST: 'Counter: view and progress orders, toggle availability, send notifications.',
  KITCHEN: 'Kitchen only: see and progress the preparation queue.',
  PLATFORM_ADMIN: 'Platform-wide administration across all restaurants.',
};

/** Roles an owner is allowed to assign (owners can never be created through the API). */
export const ASSIGNABLE_ROLES: Role[] = ['MANAGER', 'RECEPTIONIST', 'KITCHEN'];

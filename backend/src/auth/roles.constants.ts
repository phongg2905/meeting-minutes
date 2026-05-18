export const ROLE_ADMIN = 1;
export const ROLE_MINUTE_MANAGER = 2;
export const ROLE_SEARCH_USER = 3;
export const ROLE_STANDARD_USER = 4;

export const MINUTE_STATUS_DRAFT = 'draft';
export const MINUTE_STATUS_COMPLETED = 'completed';

export function isSystemAdmin(roleId?: number) {
  return roleId === ROLE_ADMIN;
}

export function isMinuteReviewer(roleId?: number) {
  return roleId === ROLE_ADMIN || roleId === ROLE_MINUTE_MANAGER;
}

export function canWriteMinutes(roleId?: number) {
  return roleId === ROLE_ADMIN || roleId === ROLE_MINUTE_MANAGER;
}

export function canManageOwnMinutes(roleId?: number) {
  return canWriteMinutes(roleId);
}

export function canManageMinute(roleId: number | undefined, userId: number | undefined, createdBy: number) {
  return isSystemAdmin(roleId) || (canManageOwnMinutes(roleId) && userId === createdBy);
}

export function isPublicMinute(minute?: { is_public?: boolean }) {
  return minute?.is_public === true;
}

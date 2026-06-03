export const USER_STATUS_ACTIVE = 'active';
export const USER_STATUS_INACTIVE = 'inactive';

export const USER_STATUSES = [
  USER_STATUS_ACTIVE,
  USER_STATUS_INACTIVE,
] as const;

export type UserStatus = typeof USER_STATUSES[number];

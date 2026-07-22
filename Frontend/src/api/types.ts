// Mirrors the backend's dto/ package (com.printforge.printforge.dto).
// Keep these in sync manually — there's no shared schema/codegen yet.

export type Role = 'student' | 'designer' | 'lab_staff' | 'admin';

export type UserDto = {
  user_id: number;
  full_name: string;
  email: string;
  role: Role;
  profile_picture_url?: string;
  suspended?: boolean;
  is_premium?: boolean;
};

export type UpdateProfilePayload = {
  fullName?: string;
  email?: string;
  profilePictureUrl?: string;
};

export type AuthResponse = {
  token: string;
  user: UserDto;
};

// Self-registration is restricted server-side to STUDENT/DESIGNER —
// see AuthService.resolveRole(). LAB_STAFF/ADMIN can only be created by
// an admin via POST /api/admin/users, so don't offer them here.
export type SelfRegisterRole = 'STUDENT' | 'DESIGNER';

export type RegisterPayload = {
  full_name: string;
  email: string;
  password: string;
  confirm_password: string;
  role?: SelfRegisterRole;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type ErrorResponse = {
  status: number;
  message: string;
  timestamp: string;
};

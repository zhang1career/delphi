export type AuthUser = {
  id: number;
  username: string;
  email: string;
  phone: string;
  avatar: string;
  status: number;
  auth_status: number;
  ext: Record<string, unknown>;
  ct: number;
  ut: number;
};

export type LoginSession = {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
};

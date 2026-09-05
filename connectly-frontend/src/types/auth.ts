export type AuthMode = 'signin' | 'signup';

export interface AuthFormData {
  username?: string;
  email: string;
  password: string;
  rememberMe?: boolean;
  termsAccepted?: boolean;
}

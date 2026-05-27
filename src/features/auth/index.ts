// auth: login, session, profiles
// Responsible for Google OAuth + email/password auth via @supabase/ssr,
// session refresh (proxy.ts), and profile management.
//
// Supabase client factories live in `@/shared/supabase` — they are
// cross-cutting infra, not auth-specific.

export {
  signInWithGoogle,
  signInWithPassword,
  signOut,
  signUpWithPassword,
} from "./actions";
export type { LoginInput, SignupInput } from "./schema";
export { loginSchema, signupSchema } from "./schema";
export { AuthForm } from "./ui/auth-form";
export { SignOutButton } from "./ui/sign-out-button";

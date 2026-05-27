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
} from "./actions/auth-actions";
export { AuthForm } from "./components/auth-form";
export { SignOutButton } from "./components/sign-out-button";
export type { LoginInput, SignupInput } from "./entities/credentials";
export { loginSchema, signupSchema } from "./entities/credentials";

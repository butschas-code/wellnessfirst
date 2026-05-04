/** Map Supabase Auth errors to calm, human copy (no SaaS jargon). */
export function formatAuthError(err: { message?: string } | null | undefined): string {
  if (!err?.message) {
    return 'Something did not go through. Pause for a moment, then try again.';
  }
  const raw = err.message;
  const m = raw.toLowerCase();

  if (m.includes('invalid login credentials') || m.includes('invalid credentials')) {
    return 'That email or password does not match what we have on file. If you recently joined, confirm your email first.';
  }
  if (m.includes('email not confirmed')) {
    return 'Your email is not confirmed yet. Use the link or code we sent you, or request a new message from the verify page.';
  }
  if (m.includes('user already registered') || m.includes('already been registered')) {
    return 'An account with this email already exists. You can sign in or use “Forgot password” if you need a fresh link.';
  }
  if (m.includes('password') && m.includes('weak')) {
    return 'Please choose a stronger password — a little longer helps, and mixing letters and numbers is kinder to your future self.';
  }
  if (m.includes('signup') && m.includes('disabled')) {
    return 'New registrations are paused for now. If you believe this is a mistake, reach out through Contact.';
  }
  if (m.includes('otp') && m.includes('expired')) {
    return 'That code has expired. Request a new one and enter it within a few minutes.';
  }
  if (m.includes('token') && m.includes('expired')) {
    return 'That link or code has expired. Request a new confirmation or reset email.';
  }
  if (m.includes('invalid') && (m.includes('token') || m.includes('otp'))) {
    return 'That code does not match. Check the numbers carefully, or request a fresh code.';
  }
  if (m.includes('rate limit') || m.includes('too many')) {
    return 'Too many attempts in a short time. Wait a few minutes before trying again.';
  }
  if (m.includes('network') || m.includes('fetch')) {
    return 'We could not reach the server. Check your connection and try again.';
  }

  return raw;
}

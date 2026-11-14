// Simple, modular dashboard authentication store
// Easily customizable or replaceable with backend JWT/OAuth/session endpoints.

const USERNAME_KEY = 'a2a_dashboard_username';
const PASSWORD_KEY = 'a2a_dashboard_password';
const IS_DEFAULT_PASS_KEY = 'a2a_dashboard_is_default_pass';
const SESSION_KEY = 'a2a_dashboard_session';

export function getAdminUsername(): string {
  return localStorage.getItem(USERNAME_KEY) || 'admin';
}

export function getAdminPassword(): string {
  return localStorage.getItem(PASSWORD_KEY) || 'admin';
}

export function isDefaultPassword(): boolean {
  const isDefault = localStorage.getItem(IS_DEFAULT_PASS_KEY);
  if (isDefault === null) return true;
  return isDefault === 'true';
}

export function isDashboardAuthenticated(): boolean {
  return localStorage.getItem(SESSION_KEY) === 'true';
}

export function loginDashboard(
  user: string,
  pass: string
): { success: boolean; requiresPasswordChange: boolean; error?: string } {
  const currentUsername = getAdminUsername();
  const currentPassword = getAdminPassword();

  if (user.trim() !== currentUsername) {
    return { success: false, requiresPasswordChange: false, error: 'Invalid username' };
  }

  if (pass !== currentPassword) {
    return { success: false, requiresPasswordChange: false, error: 'Incorrect password' };
  }

  // Mark session active
  localStorage.setItem(SESSION_KEY, 'true');

  // Check if they are still using the default 'admin' password
  const needsChange = isDefaultPassword();

  return {
    success: true,
    requiresPasswordChange: needsChange,
  };
}

export function changeAdminPassword(
  oldPass: string,
  newPass: string
): { success: boolean; error?: string } {
  const currentPassword = getAdminPassword();

  if (oldPass !== currentPassword) {
    return { success: false, error: 'Current password does not match' };
  }

  if (!newPass || newPass.length < 4) {
    return { success: false, error: 'New password must be at least 4 characters' };
  }

  localStorage.setItem(PASSWORD_KEY, newPass);
  localStorage.setItem(IS_DEFAULT_PASS_KEY, 'false');
  localStorage.setItem(SESSION_KEY, 'true');

  return { success: true };
}

export function logoutDashboard(): void {
  localStorage.removeItem(SESSION_KEY);
}

// src/utils/authCache.js

const SESSION_KEY = 'cached_session';
const USER_KEY = 'cached_user';
const COMPANY_KEY = 'cached_company';

export const cacheAuthData = (session, user, company) => {
  try {
    if (session) {
      localStorage.setItem(SESSION_KEY, JSON.stringify({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_at: session.expires_at,
        user: session.user
      }));
    }
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    }
    if (company) {
      localStorage.setItem(COMPANY_KEY, JSON.stringify(company));
    }
    return true;
  } catch (e) {
    console.warn('Failed to cache auth data:', e);
    return false;
  }
};

export const getCachedAuth = () => {
  try {
    const sessionData = localStorage.getItem(SESSION_KEY);
    const userData = localStorage.getItem(USER_KEY);
    const companyData = localStorage.getItem(COMPANY_KEY);
    
    if (!sessionData) return null;
    
    const session = JSON.parse(sessionData);
    const user = userData ? JSON.parse(userData) : null;
    const company = companyData ? JSON.parse(companyData) : null;
    
    const expiresAt = new Date(session.expires_at);
    if (expiresAt < new Date()) {
      return { ...session, user, company, expired: true };
    }
    
    return { ...session, user, company, expired: false };
  } catch (e) {
    console.warn('Failed to get cached auth:', e);
    return null;
  }
};

export const isSessionValid = () => {
  const cached = getCachedAuth();
  if (!cached) return false;
  if (cached.expired) return false;
  return true;
};

export const clearAuthCache = () => {
  try {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(COMPANY_KEY);
  } catch (e) {
    console.warn('Failed to clear auth cache:', e);
  }
};
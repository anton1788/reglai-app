// hooks/useRequireAuth.js
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './useAuth';

export const useRequireAuth = ({ requireCompanyApproved = false, allowedRoles = [] } = {}) => {
  const { user, isCompanyApproved, userRole, isLoading } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        navigate('/auth/login', { replace: true, state: { from: window.location.pathname } });
      } else if (requireCompanyApproved && !isCompanyApproved) {
        navigate('/company/pending', { replace: true });
      } else if (allowedRoles.length && !allowedRoles.includes(userRole)) {
        navigate('/unauthorized', { replace: true });
      }
    }
  }, [user, isCompanyApproved, userRole, isLoading, requireCompanyApproved, allowedRoles, navigate]);
  
  return { user, isLoading };
};
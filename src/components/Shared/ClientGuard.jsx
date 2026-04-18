// src/components/Shared/ClientGuard.jsx
import React from 'react';
import { Navigate } from 'react-router-dom';

const ClientGuard = ({ children, userRole, requiredRole = 'client' }) => {
  if (userRole !== requiredRole) {
    return <Navigate to="/" replace />;
  }
  return children;
};

export default ClientGuard;
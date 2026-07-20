// src/hooks/usePriceVisibility.js
import { useMemo } from 'react';
import { isMasterRole } from '../utils/materialSanitizer';
import { canEditPrices } from '../utils/priceManager';
import { canViewPrices as canViewPricesUtil } from '../utils/priceManager';

export const usePriceVisibility = (userRole) => {
  const canView = useMemo(() => canViewPricesUtil(userRole), [userRole]);
  const canEdit = useMemo(() => canEditPrices(userRole), [userRole]);
  const isMaster = useMemo(() => isMasterRole(userRole), [userRole]);
  
  return {
    canViewPrices: canView,
    canEditPrices: canEdit,
    isMaster: isMaster,
    shouldHidePrices: isMaster || !canView
  };
};

export default usePriceVisibility;
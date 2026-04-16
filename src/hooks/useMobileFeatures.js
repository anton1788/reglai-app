import { useState, useEffect } from 'react';

export const useMobileFeatures = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [isPWA, setIsPWA] = useState(false);
  const [cameraAvailable, setCameraAvailable] = useState(false);
  
  // Определяем мобильное устройство
  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || window.opera;
      const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
      setIsMobile(mobileRegex.test(userAgent));
    };
    
    const checkPWA = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isPWAInstalled = window.navigator.standalone === true;
      setIsPWA(isStandalone || isPWAInstalled);
    };
    
    const checkCamera = async () => {
      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const hasCamera = devices.some(device => device.kind === 'videoinput');
        setCameraAvailable(hasCamera);
      }
    };
    
    checkMobile();
    checkPWA();
    checkCamera();
    
    window.matchMedia('(display-mode: standalone)').addEventListener('change', checkPWA);
    
    return () => {
      window.matchMedia('(display-mode: standalone)').removeEventListener('change', checkPWA);
    };
  }, []);
  
  // Геолокация
  const getCurrentLocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp
          });
        },
        (error) => {
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    });
  };
  
  // Проверка, находится ли пользователь на объекте
  const checkLocationMatch = async (objectLat, objectLng, radiusMeters = 100) => {
    try {
      const currentLocation = await getCurrentLocation();
      const distance = calculateDistance(
        currentLocation.lat,
        currentLocation.lng,
        objectLat,
        objectLng
      );
      return distance <= radiusMeters;
    } catch (error) {
      console.error('Location check failed:', error);
      return false;
    }
  };
  
  // Расчет расстояния между координатами (формула гаверсинуса)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // радиус Земли в метрах
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    
    return R * c; // расстояние в метрах
  };
  
  // Вибрация (для подтверждения)
  const vibrate = (pattern = 200) => {
    if (window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(pattern);
    }
  };
  
  return {
    isMobile,
    isPWA,
    cameraAvailable,
    getCurrentLocation,
    checkLocationMatch,
    vibrate
  };
};
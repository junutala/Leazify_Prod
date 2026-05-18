'use client';

import React, { memo, useMemo } from 'react';
import AppIcon from './AppIcon';
import LeazifyLogo from './LeazifyLogo';

interface AppLogoProps {
  src?: string;
  iconName?: string;
  size?: number;
  className?: string;
  onClick?: () => void;
}

const AppLogo = memo(function AppLogo({
  src,
  iconName = 'SparklesIcon',
  size = 64,
  className = '',
  onClick,
}: AppLogoProps) {
  const containerClassName = useMemo(() => {
    const classes = ['flex items-center'];
    if (onClick) classes.push('cursor-pointer hover:opacity-80 transition-opacity');
    if (className) classes.push(className);
    return classes.join(' ');
  }, [onClick, className]);

  return (
    <div className={containerClassName} onClick={onClick}>
      {src ? (
        <AppIcon name={iconName} size={size} className="flex-shrink-0" />
      ) : (
        <LeazifyLogo height={size} />
      )}
    </div>
  );
});

export default AppLogo;

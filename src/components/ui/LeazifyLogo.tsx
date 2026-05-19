'use client';

import React from 'react';
import Image from 'next/image';

interface LeazifyLogoProps {
  className?: string;
  height?: number;
}

export default function LeazifyLogo({ className = '', height = 48 }: LeazifyLogoProps) {
  return (
    <Image
      src="/assets/images/color-1779168809332.png"
      alt="Leazify logo"
      height={height}
      width={height * 3}
      style={{ height, width: 'auto', objectFit: 'contain', display: 'block' }}
      className={className}
      priority
    />
  );
}

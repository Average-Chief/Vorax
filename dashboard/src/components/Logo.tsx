import React from 'react';

interface LogoProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const Logo: React.FC<LogoProps> = ({
  className = 'h-6 w-auto',
  size,
  alt = 'Vorax Logo',
  ...props
}) => {
  let sizeClasses = '';
  if (size === 'sm') sizeClasses = 'h-5 w-auto';
  if (size === 'md') sizeClasses = 'h-7 w-auto';
  if (size === 'lg') sizeClasses = 'h-10 w-auto';

  return (
    <img
      src="/logo.png"
      alt={alt}
      className={`select-none object-contain ${sizeClasses || className}`}
      {...props}
    />
  );
};

export default Logo;


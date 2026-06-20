import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'terracotta' | 'success' | 'danger' | 'outline' | 'ghost';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  isLoading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

/**
 * ATOM: Button - Consistent spacing and design systems
 */
export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  isLoading = false,
  icon,
  iconPosition = 'left',
  className = '',
  disabled,
  ...props
}) => {
  // Spacing system ratios
  const sizeClasses = {
    xs: 'px-2.5 py-1 text-[10px] font-bold rounded-lg gap-1',
    sm: 'px-3.5 py-1.5 text-xs font-bold rounded-xl gap-1.5',
    md: 'px-5 py-2.5 text-xs font-extrabold rounded-xl gap-2',
    lg: 'px-6 py-3.5 text-sm font-black rounded-2xl gap-2.5',
  };

  // Cohesive branding colors
  const variantClasses = {
    primary: 'bg-deep-olive hover:bg-[#1f3329] text-[#F7F3EC] shadow-sm active:scale-98 transition-all duration-150',
    secondary: 'bg-[#EFE8DD] hover:bg-[#E3D8CB] text-deep-olive border border-[#E3D8CB]/40 active:scale-98 transition-all',
    terracotta: 'bg-[#C58B5C] hover:bg-[#b0774a] text-[#F7F3EC] shadow-xs active:scale-98 transition-all',
    success: 'bg-[#3F7D58] hover:bg-[#326446] text-[#F7F3EC] active:scale-98 transition-all',
    danger: 'bg-[#B14A3B] hover:bg-[#94382b] text-[#F7F3EC] active:scale-98 transition-all',
    outline: 'bg-transparent hover:bg-[#EFE8DD]/30 text-deep-olive border border-[#E3D8CB] active:scale-98 transition-all',
    ghost: 'bg-transparent hover:bg-slate-100 text-slate-600',
  };

  const baseClasses = 'inline-flex items-center justify-center font-sans tracking-wide cursor-pointer transition-all duration-150 select-none border border-transparent';
  const widthClass = fullWidth ? 'w-full' : '';
  const opacityClass = (disabled || isLoading) ? 'opacity-50 cursor-not-allowed pointer-events-none scale-100' : '';

  return (
    <button
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${widthClass} ${opacityClass} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <svg className="animate-spin -ml-1 mr-2 h-3.5 w-3.5 text-current" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      {!isLoading && icon && iconPosition === 'left' && <span className="inline-flex shrink-0">{icon}</span>}
      <span>{children}</span>
      {!isLoading && icon && iconPosition === 'right' && <span className="inline-flex shrink-0">{icon}</span>}
    </button>
  );
};

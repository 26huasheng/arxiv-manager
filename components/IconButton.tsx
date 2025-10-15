import React from 'react'
import { LucideIcon } from 'lucide-react'

interface IconButtonProps {
  icon: LucideIcon
  onClick?: (e: React.MouseEvent) => void
  active?: boolean
  activeColor?: string
  hoverColor?: string
  label?: string
  disabled?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

/**
 * IconButton - Reusable icon button component with active/hover states
 */
export function IconButton({
  icon: Icon,
  onClick,
  active = false,
  activeColor = 'text-red-500 bg-red-50 dark:bg-red-900/20',
  hoverColor = 'hover:bg-gray-100 dark:hover:bg-gray-700',
  label,
  disabled = false,
  size = 'md',
  className = '',
}: IconButtonProps) {
  const sizeClasses = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-3',
  }

  const iconSizes = {
    sm: 16,
    md: 20,
    lg: 24,
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={`
        rounded-lg transition-all duration-180
        ${sizeClasses[size]}
        ${active ? activeColor : `text-gray-600 dark:text-gray-400 ${hoverColor}`}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
    >
      <Icon size={iconSizes[size]} className={active ? '' : 'transition-transform hover:scale-110'} />
    </button>
  )
}

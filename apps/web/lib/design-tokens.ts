/**
 * Design tokens for consistent styling across the application
 * These values align with the CSS custom properties in globals.css
 */

export const tokens = {
  colors: {
    bg: 'var(--color-bg)',
    surface: 'var(--color-surface)',
    surfaceElevated: 'var(--color-surface-elevated)',
    border: 'var(--color-border)',
    borderSubtle: 'var(--color-border-subtle)',
    
    // Legacy aliases
    card: 'var(--color-card)',
    hover: 'var(--color-hover)',
    
    // Text
    textPrimary: 'var(--color-text-primary)',
    textSecondary: 'var(--color-text-secondary)',
    textTertiary: 'var(--color-text-tertiary)',
    
    // Accent
    primary: 'var(--color-primary)',
    primaryHover: 'var(--color-primary-hover)',
    primaryLight: 'var(--color-primary-light)',
    
    // Status
    success: 'var(--color-success)',
    successBg: 'var(--color-success-bg)',
    warning: 'var(--color-warning)',
    warningBg: 'var(--color-warning-bg)',
    error: 'var(--color-error)',
    errorBg: 'var(--color-error-bg)',
    info: 'var(--color-info)',
    infoBg: 'var(--color-info-bg)',
    neutral: 'var(--color-neutral)',
    neutralBg: 'var(--color-neutral-bg)',
  },
  
  spacing: {
    1: 'var(--space-1)',
    2: 'var(--space-2)',
    3: 'var(--space-3)',
    4: 'var(--space-4)',
    6: 'var(--space-6)',
    8: 'var(--space-8)',
    12: 'var(--space-12)',
  },
  
  typography: {
    fontSans: 'var(--font-sans)',
    xs: 'var(--text-xs)',
    sm: 'var(--text-sm)',
    base: 'var(--text-base)',
    lg: 'var(--text-lg)',
    xl: 'var(--text-xl)',
    '2xl': 'var(--text-2xl)',
    '3xl': 'var(--text-3xl)',
  },
  
  shadows: {
    sm: 'var(--shadow-sm)',
    md: 'var(--shadow-md)',
    lg: 'var(--shadow-lg)',
  },
  
  radius: {
    sm: 'var(--radius-sm)',
    md: 'var(--radius-md)',
    lg: 'var(--radius-lg)',
  },
} as const


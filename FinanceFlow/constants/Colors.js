// Color Constants for Finance Flow App
// This file ensures consistent color usage across the entire application

export const Colors = {
    // Primary Colors
    primary: '#8b5cf6',           // Main purple accent color
    primaryLight: '#a78bfa',      // Lighter purple for hover states
    primaryDark: '#7c3aed',       // Darker purple for pressed states

    // Background Colors
    background: '#f8fafc',        // Main background color
    backgroundSecondary: '#ffffff', // Card backgrounds
    backgroundTertiary: '#f1f5f9',  // Subtle backgrounds

    // Text Colors
    textPrimary: '#1e293b',       // Main text color
    textSecondary: '#64748b',     // Secondary text color
    textTertiary: '#94a3b8',      // Tertiary text color
    textInverse: '#ffffff',       // White text for dark backgrounds

    // Status Colors
    success: '#22c55e',           // Green for positive values
    error: '#ef4444',             // Red for negative values
    warning: '#f59e0b',           // Orange for warnings
    info: '#3b82f6',              // Blue for information

    // Border Colors
    border: '#e2e8f0',            // Main border color
    borderLight: '#f1f5f9',       // Light border color
    borderDark: '#cbd5e1',        // Dark border color

    // Shadow Colors
    shadow: '#8b5cf6',            // Purple-tinted shadows
    shadowLight: '#000000',       // Black shadows for depth

    // Chart Colors (for data visualization)
    chartColors: [
        '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe', '#ede9fe',
        '#f3e8ff', '#faf5ff', '#fef3c7', '#fde68a', '#f59e0b'
    ],

    // Skeleton Loading
    skeleton: '#E1E9EE',          // Skeleton loading color

    // Interactive States
    hover: '#f3f0ff',             // Hover state background
    pressed: '#ede9fe',           // Pressed state background
    disabled: '#e2e8f0',          // Disabled state color
};

// Export individual colors for convenience
export const {
    primary,
    primaryLight,
    primaryDark,
    background,
    backgroundSecondary,
    backgroundTertiary,
    textPrimary,
    textSecondary,
    textTertiary,
    textInverse,
    success,
    error,
    warning,
    info,
    border,
    borderLight,
    borderDark,
    shadow,
    shadowLight,
    chartColors,
    skeleton,
    hover,
    pressed,
    disabled
} = Colors;

export default Colors;

// Custom Color Theme Configuration
export const colors = {
  // Primary Brand Colors
  primary: {
    gold: "#d1a648",
    orange: "#c56d45",
    sage: "#78966e",
    teal: "#135663",
  },

  // Role-based themes
  student: {
    primary: "#135663", // Dark Teal
    secondary: "#78966e", // Sage Green
    accent: "#d1a648", // Gold
    accent2: "#c56d45", // Orange
  },

  instructor: {
    primary: "#c56d45", // Orange
    secondary: "#d1a648", // Gold
    accent: "#135663", // Dark Teal
    accent2: "#78966e", // Sage Green
  },

  // Semantic colors
  success: "#78966e",
  warning: "#d1a648",
  error: "#dc2626",
  info: "#135663",

  // Neutral colors
  gray: {
    50: "#f9fafb",
    100: "#f3f4f6",
    200: "#e5e7eb",
    300: "#d1d5db",
    400: "#9ca3af",
    500: "#6b7280",
    600: "#4b5563",
    700: "#374151",
    800: "#1f2937",
    900: "#111827",
  },

  // Background gradients
  gradients: {
    student: {
      bg: "linear-gradient(135deg, #fef7e0 0%, #ffffff 50%, #fef2e8 100%)",
      primary: "linear-gradient(90deg, #135663, #78966e)",
      secondary: "linear-gradient(90deg, #d1a648, #c56d45)",
      card: "linear-gradient(135deg, #f5f1e8, #f0ebe0)",
    },
    instructor: {
      bg: "linear-gradient(135deg, #fef2e8 0%, #ffffff 50%, #fef7e0 100%)",
      primary: "linear-gradient(90deg, #c56d45, #d1a648)",
      secondary: "linear-gradient(90deg, #135663, #78966e)",
      card: "linear-gradient(135deg, #fef2e8, #fef7e0)",
    },
    admin: {
      bg: "linear-gradient(135deg, #f8f6f0 0%, #ffffff 50%, #f5f3ed 100%)",
      primary: "linear-gradient(90deg, #135663, #c56d45)",
      secondary: "linear-gradient(90deg, #78966e, #d1a648)",
      card: "linear-gradient(135deg, #f8f6f0, #f5f3ed)",
    },
  },
};

// CSS Custom Properties Generator
export const generateCSSVariables = (role = "student") => {
  const theme = colors[role] || colors.student;
  return {
    "--color-primary": theme.primary,
    "--color-secondary": theme.secondary,
    "--color-accent": theme.accent,
    "--color-accent-2": theme.accent2,
    "--color-success": colors.success,
    "--color-warning": colors.warning,
    "--color-error": colors.error,
    "--color-info": colors.info,
    "--gradient-bg": colors.gradients[role]?.bg || colors.gradients.student.bg,
    "--gradient-primary":
      colors.gradients[role]?.primary || colors.gradients.student.primary,
    "--gradient-secondary":
      colors.gradients[role]?.secondary || colors.gradients.student.secondary,
    "--gradient-card":
      colors.gradients[role]?.card || colors.gradients.student.card,
  };
};

// Utility functions
export const getThemeColors = (role = "student") =>
  colors[role] || colors.student;
export const getGradient = (type, role = "student") =>
  colors.gradients[role]?.[type] || colors.gradients.student[type];

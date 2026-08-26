export const BRAND = {
  name: process.env.NEXT_PUBLIC_APP_NAME || "Underwrite",
  shortName: process.env.NEXT_PUBLIC_APP_SHORT_NAME || "UW",
  description: "Financial research with an auditable chain of evidence.",
} as const;

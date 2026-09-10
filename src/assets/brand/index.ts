/**
 * Single point of reference for the GiantPay/GiantPlus logo asset.
 *
 * Supplied by the product owner as a JPEG export (full lockup: mark +
 * "GiantPay" + "GLOBAL FINANCE SOLUTIONS" tagline, on its own light
 * off-white backing). `src/components/navigation/Logo.tsx` is the only
 * consumer — swap this import if a cleaner (e.g. transparent-background
 * PNG, or a standalone icon-only mark for compact/favicon use) asset is
 * ever supplied. Never redraw, recolor, crop or distort the source file.
 */
import logoFull from './giantpay-logo.jpg';
export const LOGO_SRC: string | null = logoFull;

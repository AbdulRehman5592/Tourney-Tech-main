import Link from "next/link";

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition " +
  "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--background)] " +
  "disabled:opacity-50 disabled:pointer-events-none";

const SIZES = {
  sm: "px-4 py-2 text-sm",
  md: "px-5 py-2.5 text-sm",
  lg: "px-6 py-3 text-base",
};

const VARIANTS = {
  primary:
    "bg-[var(--accent-color)] text-[#151a24] hover:bg-[var(--accent-hover)] focus:ring-[var(--accent-color)]",
  secondary:
    "bg-[var(--secondary-color)] text-[var(--foreground)] hover:bg-[var(--secondary-hover)] focus:ring-[var(--accent-color)] border border-[var(--border-color)]",
  ghost:
    "bg-transparent text-[var(--foreground)] border border-[var(--border-color)] hover:bg-[var(--secondary-color)] focus:ring-[var(--accent-color)]",
  destructive:
    "bg-[color-mix(in_srgb,var(--error-color)_12%,transparent)] text-[var(--error-color)] border border-[color-mix(in_srgb,var(--error-color)_40%,transparent)] hover:bg-[color-mix(in_srgb,var(--error-color)_20%,transparent)] focus:ring-[var(--error-color)]",
};

/**
 * Shared button used across the site so every "primary action" / "cancel" /
 * "destructive" control looks and behaves the same everywhere, instead of
 * being hand-styled per page. Renders a <button>, or a Next.js <Link> when
 * `href` is passed (e.g. for a styled call-to-action that navigates).
 */
export default function Button({
  variant = "primary",
  size = "md",
  href,
  className = "",
  children,
  ...props
}) {
  const classes = `${BASE} ${SIZES[size] || SIZES.md} ${VARIANTS[variant] || VARIANTS.primary} ${className}`;

  if (href) {
    return (
      <Link href={href} className={classes} {...props}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" className={classes} {...props}>
      {children}
    </button>
  );
}

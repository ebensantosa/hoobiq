/**
 * Inline loading spinner. Sized to follow surrounding text height. Use
 * inside buttons to make a "pending" state visually obvious — far
 * clearer than swapping the label alone.
 */
export function Spinner({ size = 14 }: { size?: number }) {
  return (
    <span
      className="inline-block animate-spin rounded-full border-2 border-current border-t-transparent align-[-2px]"
      style={{ width: size, height: size }}
      aria-hidden
    />
  );
}

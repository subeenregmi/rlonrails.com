/**
 * A plain checkmark: one stroke, square ends, a mitred corner. The icon set's
 * version is a filled shape with rounded ends and a swelling tail, which reads
 * as a badge rather than as a tick somebody made.
 */
export function Tick({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg
      className={className}
      style={style}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="square"
      aria-hidden="true"
    >
      <path d="M3.5 8.5 6.5 11.5 12.5 4.5" />
    </svg>
  );
}

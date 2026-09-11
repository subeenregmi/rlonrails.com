export function Roundel({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" aria-hidden="true">
      <circle cx="50" cy="50" r="48" fill="#fff" />
      <circle cx="50" cy="50" r="33" fill="none" stroke="#E32017" strokeWidth="15" />
      <rect x="2" y="38" width="96" height="24" fill="#0019A8" />
      <text
        x="50"
        y="50.5"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="21"
        fontFamily="var(--font-display)"
        letterSpacing="3"
        fill="#fff"
      >
        RL
      </text>
    </svg>
  );
}

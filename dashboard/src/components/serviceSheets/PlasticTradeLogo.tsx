export function PlasticTradeLogo({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 220 72"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Plastic Trade"
    >
      <path
        d="M8 58 L28 8 L48 58 L38 58 L28 32 L18 58 Z"
        stroke="#111827"
        strokeWidth="3.5"
        strokeLinejoin="miter"
        fill="none"
      />
      <path
        d="M22 58 L42 8 L62 58 L52 58 L42 32 L32 58 Z"
        stroke="#111827"
        strokeWidth="3.5"
        strokeLinejoin="miter"
        fill="none"
      />
      <path
        d="M36 58 L56 8 L76 58 L66 58 L56 32 L46 58 Z"
        stroke="#111827"
        strokeWidth="3.5"
        strokeLinejoin="miter"
        fill="none"
      />
      <text
        x="88"
        y="28"
        fill="#111827"
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize="18"
        fontWeight="700"
        fontStyle="italic"
      >
        PLASTIC
      </text>
      <text
        x="88"
        y="50"
        fill="#111827"
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize="18"
        fontWeight="700"
        fontStyle="italic"
      >
        TRADE
      </text>
    </svg>
  );
}

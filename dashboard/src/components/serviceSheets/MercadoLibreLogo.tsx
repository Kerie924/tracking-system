export function MercadoLibreLogo({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 72"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Mercado Libre"
    >
      <ellipse cx="60" cy="28" rx="34" ry="22" fill="#FFE600" stroke="#2D3277" strokeWidth="2" />
      <path
        d="M38 30 C44 18, 52 18, 60 28 C68 18, 76 18, 82 30"
        stroke="#2D3277"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M42 34 C48 24, 54 24, 60 32 C66 24, 72 24, 78 34"
        stroke="#2D3277"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      <text
        x="60"
        y="62"
        textAnchor="middle"
        fill="#2D3277"
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize="11"
        fontWeight="600"
      >
        mercado libre
      </text>
    </svg>
  );
}

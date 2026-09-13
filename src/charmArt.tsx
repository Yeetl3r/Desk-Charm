import { useId, type ReactElement } from "react";
import type { Charm } from "./charms";

function NimbuMirchiArt({ size }: { size: number }) {
  const height = size * 1.5;
  const gradId = `nimbu-shade-${useId()}`;
  return (
    <svg width={size} height={height} viewBox="0 0 44 68" style={{ display: "block", overflow: "visible" }}>
      <defs>
        <radialGradient id={gradId} cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#fff6c9" stopOpacity="0.5" />
          <stop offset="60%" stopColor="#ffd400" stopOpacity="0" />
          <stop offset="100%" stopColor="#b87f00" stopOpacity="0.35" />
        </radialGradient>
        <path
          id={`${gradId}-chili`}
          d="M -1.3,0 C -1.7,2.5 -1.7,4 -1.5,5.5 C -1.1,10 -0.1,14.5 1.5,18.5 C 2.2,14.5 2.0,9.5 1.7,5.5 C 1.8,4 1.6,2.5 1.3,0 Z"
        />
        <path id={`${gradId}-cap`} d="M -1.2,-1.3 C -1.2,-2.1 1.2,-2.1 1.2,-1.3 C 1.2,-0.5 -1.2,-0.5 -1.2,-1.3 Z" />
      </defs>

      <line x1="22" y1="0" x2="22" y2="30" stroke="rgba(150,115,65,0.6)" strokeWidth="1" />

      <circle cx="22" cy="43" r="13.5" fill="#ffd400" />
      <circle cx="22" cy="43" r="13.5" fill="none" stroke="#e6a800" strokeWidth="0.8" opacity="0.6" />
      <circle cx="22" cy="43" r="13.5" fill={`url(#${gradId})`} opacity="0.35" />
      <ellipse cx="16.5" cy="36.5" rx="4.4" ry="2.7" fill="#fff2a8" opacity="0.85" />

      <g transform="translate(14,38) rotate(-105) scale(1.3)">
        <use href={`#${gradId}-chili`} fill="#3f7a28" />
        <use href={`#${gradId}-cap`} fill="#c9b183" />
      </g>
      <g transform="translate(17,29) rotate(-35) scale(-1.25,1.25)">
        <use href={`#${gradId}-chili`} fill="#5e9e39" />
        <use href={`#${gradId}-cap`} fill="#d6c093" />
      </g>
      <g transform="translate(26,28) rotate(25) scale(1.25)">
        <use href={`#${gradId}-chili`} fill="#4a8a2e" />
        <use href={`#${gradId}-cap`} fill="#c9b183" />
      </g>
      <g transform="translate(30,38) rotate(100) scale(-1.3,1.3)">
        <use href={`#${gradId}-chili`} fill="#3f7a28" />
        <use href={`#${gradId}-cap`} fill="#c9b183" />
      </g>

      <circle cx="20" cy="62" r="3.4" fill="#241811" />
      <circle cx="24.2" cy="63.4" r="2.4" fill="#1c130d" />
      <circle cx="21.3" cy="64.8" r="2" fill="#2e2016" />
    </svg>
  );
}

const CUSTOM_ART: Record<string, (props: { size: number }) => ReactElement> = {
  "nimbu-mirchi": NimbuMirchiArt,
};

export function CharmGlyph({ charm, size }: { charm: Charm; size: number }) {
  const Art = CUSTOM_ART[charm.id];
  if (Art) return <Art size={size} />;
  return <span style={{ fontSize: size, lineHeight: 1 }}>{charm.emoji}</span>;
}

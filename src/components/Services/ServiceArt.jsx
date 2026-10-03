// Ilustraciones propias (SVG) para cada familia de servicios, en la paleta de marca.
// Sustituyen fotografías de stock: no representan personas reales.
const NAVY = '#102a43';
const NAVY_SOFT = '#7f98b0';
const MIST = '#d2dce6';
const GOLD = '#c69a49';
const GOLD_SOFT = '#f6eedd';

function Goals() {
  return (
    <>
      <circle cx="252" cy="58" r="34" fill={GOLD_SOFT} />
      <line x1="44" y1="182" x2="276" y2="182" stroke={NAVY} strokeWidth="2" strokeLinecap="round" />
      <rect className="art-rise" x="66" y="142" width="34" height="40" rx="8" fill={MIST} />
      <rect className="art-rise" x="114" y="118" width="34" height="64" rx="8" fill={NAVY_SOFT} opacity="0.55" />
      <rect className="art-rise" x="162" y="94" width="34" height="88" rx="8" fill={NAVY_SOFT} />
      <rect className="art-rise" x="210" y="70" width="34" height="112" rx="8" fill={NAVY} />
      <path d="M83 134 C 120 118, 150 104, 180 88 S 214 70, 227 62" fill="none" stroke={GOLD} strokeWidth="2.5" strokeDasharray="2 7" strokeLinecap="round" />
      <line x1="227" y1="70" x2="227" y2="30" stroke={NAVY} strokeWidth="2" strokeLinecap="round" />
      <path className="art-flag" d="M227 30 L258 38 L227 47 Z" fill={GOLD} />
      <circle cx="58" cy="96" r="13" fill={GOLD} />
      <circle cx="58" cy="96" r="7" fill="none" stroke={GOLD_SOFT} strokeWidth="2" />
    </>
  );
}

function Retirement() {
  return (
    <>
      <circle className="art-sun" cx="160" cy="128" r="46" fill={GOLD} />
      <g stroke={GOLD} strokeWidth="2" strokeLinecap="round" opacity="0.6">
        <line x1="160" y1="56" x2="160" y2="70" />
        <line x1="104" y1="80" x2="113" y2="90" />
        <line x1="216" y1="80" x2="207" y2="90" />
        <line x1="84" y1="128" x2="98" y2="128" />
        <line x1="222" y1="128" x2="236" y2="128" />
      </g>
      <path d="M0 140 C 70 118, 120 132, 170 140 S 270 124, 320 132 V220 H0 Z" fill={NAVY_SOFT} />
      <path d="M0 166 C 80 146, 150 170, 220 160 S 290 150, 320 156 V220 H0 Z" fill={NAVY} />
      <path d="M150 220 C 156 196, 176 184, 168 168 S 158 152, 164 144" fill="none" stroke={GOLD_SOFT} strokeWidth="5" strokeLinecap="round" opacity="0.8" />
    </>
  );
}

function Education() {
  return (
    <>
      <circle cx="70" cy="52" r="5" fill={GOLD} />
      <circle cx="262" cy="74" r="4" fill={GOLD} opacity="0.7" />
      <circle cx="246" cy="36" r="3" fill={NAVY_SOFT} />
      <path d="M160 116 C 130 104, 96 102, 66 108 V184 C 96 178, 130 180, 160 192 Z" fill="#fff" stroke={NAVY} strokeWidth="2" strokeLinejoin="round" />
      <path d="M160 116 C 190 104, 224 102, 254 108 V184 C 224 178, 190 180, 160 192 Z" fill="#fff" stroke={NAVY} strokeWidth="2" strokeLinejoin="round" />
      <g stroke={MIST} strokeWidth="2" strokeLinecap="round">
        <line x1="84" y1="128" x2="142" y2="132" />
        <line x1="84" y1="144" x2="142" y2="148" />
        <line x1="84" y1="160" x2="130" y2="163" />
        <line x1="178" y1="132" x2="236" y2="128" />
        <line x1="178" y1="148" x2="236" y2="144" />
      </g>
      <g className="art-cap">
        <path d="M160 40 L220 64 L160 88 L100 64 Z" fill={NAVY} />
        <path d="M128 76 V96 C 144 108, 176 108, 192 96 V76 L160 88 Z" fill={NAVY_SOFT} />
        <path d="M206 70 V96" stroke={GOLD} strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="206" cy="100" r="5" fill={GOLD} />
      </g>
    </>
  );
}

function Life() {
  return (
    <>
      <path d="M40 176 H96 L108 150 L122 196 L138 120 L152 176 H280" fill="none" stroke={MIST} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <g className="art-umbrella">
        <path d="M84 112 C 92 62, 132 36, 160 36 C 188 36, 228 62, 236 112 C 222 102, 206 102, 198 112 C 186 102, 172 102, 160 112 C 148 102, 134 102, 122 112 C 114 102, 98 102, 84 112 Z" fill={GOLD} />
        <path d="M160 36 C 150 60, 146 86, 148 108" fill="none" stroke={GOLD_SOFT} strokeWidth="2" opacity="0.8" />
        <path d="M160 36 C 170 60, 174 86, 172 108" fill="none" stroke={GOLD_SOFT} strokeWidth="2" opacity="0.8" />
        <line x1="160" y1="30" x2="160" y2="36" stroke={NAVY} strokeWidth="3" strokeLinecap="round" />
      </g>
      <path d="M160 112 V176 C 160 186, 148 186, 148 178" fill="none" stroke={NAVY} strokeWidth="3" strokeLinecap="round" />
      <path d="M160 160 C 160 160, 124 140, 124 122 C 124 112, 132 106, 141 106 C 149 106, 155 111, 160 118 C 165 111, 171 106, 179 106 C 188 106, 196 112, 196 122 C 196 140, 160 160, 160 160 Z" fill={NAVY} transform="translate(64 60) scale(0.6)" />
    </>
  );
}

function Home() {
  return (
    <>
      <line x1="36" y1="184" x2="284" y2="184" stroke={NAVY} strokeWidth="2" strokeLinecap="round" />
      <path d="M92 104 L148 58 L204 104" fill="none" stroke={NAVY} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
      <rect x="104" y="98" width="88" height="86" rx="4" fill="#fff" stroke={NAVY} strokeWidth="2" />
      <rect x="138" y="140" width="22" height="44" rx="3" fill={GOLD} />
      <rect x="114" y="112" width="22" height="20" rx="3" fill={MIST} />
      <rect x="162" y="112" width="20" height="20" rx="3" fill={MIST} />
      <rect x="172" y="66" width="12" height="24" fill={NAVY_SOFT} />
      <g className="art-car">
        <path d="M196 170 C 196 160, 202 156, 212 154 L226 140 C 230 136, 236 134, 242 134 H262 C 270 134, 276 138, 280 144 L288 156 C 296 158, 300 162, 300 170 V176 H196 Z" fill={NAVY} />
        <path d="M230 152 L240 142 H258 C 262 142, 266 144, 268 148 L271 152 Z" fill={GOLD_SOFT} />
        <circle cx="220" cy="178" r="10" fill={NAVY} stroke="#fff" strokeWidth="3" />
        <circle cx="278" cy="178" r="10" fill={NAVY} stroke="#fff" strokeWidth="3" />
        <rect x="290" y="162" width="8" height="5" rx="2" fill={GOLD} />
      </g>
    </>
  );
}

const ART = { goals: Goals, retirement: Retirement, education: Education, life: Life, home: Home };

export function ServiceArt({ name }) {
  const Art = ART[name] ?? Goals;
  return (
    <svg className="svc-art" viewBox="0 0 320 220" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid meet">
      <Art />
    </svg>
  );
}

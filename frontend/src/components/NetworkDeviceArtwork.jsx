// All device drawings share a coordinate system so they can also be used in the palette.
export default function NetworkDeviceArtwork({ type, ...props }) {
  return (
    <svg viewBox="0 0 160 112" fill="none" aria-hidden="true" {...props}>
      {type === 'pc' ? <>
        <ellipse cx="80" cy="105" rx="58" ry="5" fill="#000" opacity="0.15" />
        <path d="M61 79H82L85 96H57L61 79Z" fill="#57677b" />
        <path d="M53 96H90L96 101H47L53 96Z" fill="#8b9bb0" />
        <rect x="18" y="12" width="105" height="72" rx="5" fill="#47566b" stroke="#94a3b8" />
        <rect x="23" y="17" width="95" height="59" rx="2" fill="#111f35" />
        <path d="M35 34L44 41L35 48M51 49H68" stroke="#7bb9ff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M35 59H84M35 64H69" stroke="#314b6c" strokeWidth="2" />
        <circle cx="71" cy="80" r="1.5" fill="#93c5fd" />
        <rect x="128" y="30" width="24" height="71" rx="3" fill="#354359" stroke="#7e90a9" />
        <path d="M133 40H147M133 45H147M133 79H147M133 84H147" stroke="#6b7f9c" strokeWidth="2" />
        <circle cx="140" cy="93" r="2" fill="#60a5fa" />
      </> : type === 'server' ? <>
        <ellipse cx="80" cy="106" rx="49" ry="5" fill="#000" opacity="0.15" />
        <path d="M46 10L56 4H121V99L111 106H46V10Z" fill="#2a384c" stroke="#8a9db6" />
        <rect x="47" y="11" width="63" height="94" rx="3" fill="#41516a" stroke="#8a9db6" />
        {[22, 47, 72].map(y => <g key={y}><rect x="54" y={y} width="49" height="19" rx="2" fill="#202d40" stroke="#75869e" /><path d={`M61 ${y + 6}H84M61 ${y + 11}H84`} stroke="#667d98" strokeWidth="2" /><circle cx="96" cy={y + 9} r="2" fill="#fbbf24" /></g>)}
      </> : type === 'laptop' ? <>
        <ellipse cx="80" cy="105" rx="63" ry="5" fill="#000" opacity="0.15" />
        <rect x="32" y="14" width="98" height="65" rx="4" fill="#46566c" stroke="#91a4bd" />
        <rect x="37" y="19" width="88" height="54" rx="2" fill="#14273d" />
        <path d="M49 39L58 46L49 53M66 54H84" stroke="#93c5fd" strokeWidth="3" strokeLinecap="round" />
        <path d="M32 79H130L148 99H14L32 79Z" fill="#7e91aa" stroke="#b0bfd0" />
        <path d="M14 99H148V103H14V99Z" fill="#495b73" />
        <path d="M39 84H124M33 89H131M28 94H135" stroke="#4a5c73" strokeWidth="2" />
        <path d="M66 94H98L102 99H62L66 94Z" fill="#a6b4c7" />
      </> : type === 'ap' ? <>
        <ellipse cx="80" cy="101" rx="57" ry="5" fill="#000" opacity="0.15" />
        <path d="M24 73L38 52H122L136 73V91H24V73Z" fill="#7e8ca2" stroke="#c2ccda" />
        <path d="M24 73H136V91H24V73Z" fill="#516179" stroke="#9dacbf" />
        <path d="M40 55V15M120 55V15" stroke="#a5b4c8" strokeWidth="5" strokeLinecap="round" />
        <path d="M62 48Q80 33 98 48M68 55Q80 45 92 55M75 62Q80 58 85 62" stroke="#f472b6" strokeWidth="3" strokeLinecap="round" />
        <circle cx="115" cy="81" r="2" fill="#f9a8d4" />
      </> : type === 'cloud' ? <>
        <ellipse cx="80" cy="101" rx="61" ry="5" fill="#000" opacity="0.15" />
        <path d="M35 83C6 83 6 48 32 45C31 15 72 7 87 29C112 13 138 32 133 53C157 62 147 87 127 87H35V83Z" fill="#52677e" stroke="#9db0c5" strokeWidth="2" />
        <path d="M51 61H106M98 54L106 61L98 68M63 73H85" stroke="#d0e3f4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </> : type === 'firewall' ? <>
        <ellipse cx="80" cy="104" rx="61" ry="5" fill="#000" opacity="0.15" />
        <rect x="27" y="19" width="106" height="80" rx="3" fill="#805547" stroke="#d7a68c" />
        <path d="M27 39H133M27 59H133M27 79H133M53 19V39M104 19V39M78 39V59M53 59V79M104 59V79M78 79V99" stroke="#b77a60" strokeWidth="2" />
        <path d="M80 33L101 42V60C101 74 80 85 80 85C80 85 59 74 59 60V42L80 33Z" fill="#263b4a" stroke="#fbb485" strokeWidth="2" />
        <path d="M70 59L77 66L91 51" stroke="#fdba74" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </> : type === 'switch' || type === 'l3switch' ? <>
        <ellipse cx="80" cy="99" rx="70" ry="6" fill="#000" opacity="0.15" />
        <path d="M9 46L32 28H144L151 46H9Z" fill="#68788d" stroke="#94a3b8" />
        <path d="M9 46H151V90H9V46Z" fill="#364458" stroke="#8c9cb1" />
        <path d="M151 46L144 28V71L151 90V46Z" fill="#283547" />
        <path d="M22 37H67" stroke="#a5b4cb" strokeWidth="2" />
        {Array.from({ length: 8 }, (_, index) => <g key={index}>
          <rect x={18 + index * 15.3} y="60" width="11" height="14" rx="1" fill="#152131" stroke="#8995a8" strokeWidth="0.6" />
          <path d={`M${20 + index * 15.3} 62h7`} stroke="#b3a0e2" strokeWidth="2" />
          <rect x={21 + index * 15.3} y="80" width="4" height="2" rx="1" fill="#a78bfa" />
        </g>)}
        <circle cx="16" cy="52" r="1.5" fill="#c4b5fd" />
        {type === 'l3switch' && <text x="105" y="39" fill="#e3d5ff" fontSize="9" fontFamily="monospace">L3</text>}
      </> : <>
        <ellipse cx="80" cy="104" rx="62" ry="5" fill="#000" opacity="0.15" />
        <path d="M18 51V76C18 92 46 102 80 102C114 102 142 92 142 76V51H18Z" fill="#2d4957" stroke="#7da6b3" />
        <ellipse cx="80" cy="51" rx="62" ry="26" fill="#466a78" stroke="#9abfc7" />
        <path d="M53 49H70M64 43L71 49L64 55M107 51H90M96 45L89 51L96 57M79 35V46M74 40L79 46L84 40M81 66V55M76 61L81 55L86 61" stroke="#b8f3ed" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M30 77V83M38 80V86M46 83V89" stroke="#6d93a2" strokeWidth="2" />
        <circle cx="119" cy="82" r="2" fill="#2dd4bf" />
        <circle cx="127" cy="78" r="2" fill="#2dd4bf" opacity="0.5" />
      </>}
    </svg>
  );
}

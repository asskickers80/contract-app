import { useEffect } from 'react'

// 스플래시(로딩) 화면 — 점포라인 로고 + 로딩 애니메이션. 지정 시간 후 onDone.
// 로고 파일: public/jeompoline-logo.png, jeompoline-tree.png (교체 시 이 두 파일만 바꾸면 됨)
const BASE = import.meta.env.BASE_URL // /app/

export default function SplashScreen({ onDone, duration = 1600 }) {
  useEffect(() => {
    const t = setTimeout(onDone, duration)
    return () => clearTimeout(t)
  }, [onDone, duration])

  return (
    <div className="flex h-dvh flex-col items-center justify-center bg-white">
      <style>{`
        @keyframes splashPulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.12); } }
        @keyframes splashFade { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
        @keyframes splashBar { from { width: 0; } to { width: 100%; } }
      `}</style>

      <img
        src={`${BASE}jeompoline-tree.png`}
        alt=""
        className="h-20 w-20 object-contain"
        style={{ animation: 'splashPulse 1.1s ease-in-out infinite' }}
      />
      <img
        src={`${BASE}jeompoline-logo.png`}
        alt="점포라인"
        className="mt-5 h-9 object-contain"
        style={{ animation: 'splashFade 0.6s ease-out both' }}
      />

      {/* 로딩 바 */}
      <div className="mt-8 h-1 w-40 overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full bg-[#8bc53f]"
          style={{ animation: `splashBar ${duration}ms ease-in-out both` }}
        />
      </div>
      <p className="mt-4 text-xs text-gray-300">점포라인 업무 앱</p>
    </div>
  )
}

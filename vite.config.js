import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// 인트라넷 중계(프록시) 모드:
// .env에 INTRANET_TARGET=http://<인트라넷 주소> 를 넣으면
// 이 서버가 인트라넷을 같은 출처(/)로 중계한다 → iframe 보안 장벽이 사라져
// '반영'(화면 캡처)이 가능해진다. 앱 자신은 /app/ 경로로 이동.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const target = env.INTRANET_TARGET || ''

  const proxy = target
    ? {
        '/': {
          target,
          changeOrigin: true, // Host 헤더를 인트라넷 것으로
          secure: false,
          // 앱 자신(/app/*)과 vite 내부 경로는 중계하지 않는다
          bypass: req => {
            const url = req.url || ''
            if (url.startsWith('/app')) return url
            return undefined // 나머지 전부 인트라넷으로 중계
          },
        },
      }
    : undefined

  return {
    base: '/app/',
    // 산출물을 dist/app/ 아래로 → Vercel 정적 루트(/)에 index.html이 놓이지 않게 한다.
    // (루트 /는 순수하게 인트라넷 프록시로 넘겨야 iframe에 인트라넷이 뜬다)
    build: { outDir: 'dist/app', emptyOutDir: true },
    plugins: [react(), tailwindcss()],
    define: {
      'import.meta.env.VITE_PROXY_ENABLED': JSON.stringify(target ? '1' : ''),
      // 빌드 시각 스탬프 — 기기가 어떤 버전을 실행 중인지 화면에서 확인용
      __BUILD_TIME__: JSON.stringify(
        new Date().toLocaleString('ko-KR', {
          timeZone: 'Asia/Seoul',
          year: '2-digit', month: 'numeric', day: 'numeric',
          hour: '2-digit', minute: '2-digit', hour12: false,
        })
      ),
    },
    server: { host: true, proxy },
    preview: { host: true, proxy },
  }
})

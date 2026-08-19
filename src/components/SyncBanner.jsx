import { useEffect, useState } from 'react'
import { onSyncState } from '../lib/boardStore.js'

// 서버 백업 상태 배너 — 백업이 안 되고 있으면 눈에 띄게 알린다
// (기기 저장소는 홈 화면 앱 재설치 등으로 언제든 비워질 수 있어, 서버 백업 실패는 곧 유실 위험)
export default function SyncBanner() {
  const [sync, setSync] = useState({ status: 'unknown', message: null })

  useEffect(() => onSyncState(setSync), [])

  if (sync.status === 'ok' || sync.status === 'unknown') return null

  return (
    <div className="mx-auto max-w-2xl px-4 pb-2">
      <div className="rounded-xl bg-warn px-4 py-3 text-on-warn">
        <p className="text-sm font-extrabold">
          ⚠ 서버 백업이 동작하지 않아요 — 지금 작업은 이 기기에만 저장됩니다
        </p>
        <p className="mt-0.5 text-xs opacity-90">
          {sync.status === 'off'
            ? '서버 저장이 설정되지 않았습니다. (.env의 Supabase 설정 확인)'
            : `이 상태에서 홈 화면 앱을 지우면 작업이 유실됩니다. 오류: ${sync.message || '알 수 없음'}`}
        </p>
      </div>
    </div>
  )
}

// 브라우저 '뒤로 가기'를 앱 내부 내비게이션으로 전환
// - 열려 있는 화면(캡처 뷰어·라이브러리·계약서 단계·패널)이 있으면 그것을 한 단계 닫는다
// - 더 닫을 게 없으면 아무 일도 하지 않는다 → 뒤로 가기로 앱을 벗어나 작업을 잃는 일 방지
import { useEffect, useRef } from 'react'

const stack = [] // 나중에 등록된 핸들러가 우선 (위에 떠 있는 화면부터 닫힘)
let initialized = false

function arm() {
  // 히스토리에 보초 항목을 하나 세워 둔다 — 뒤로 가기가 앱을 벗어나지 않게
  if (!history.state?.appGuard) history.pushState({ appGuard: true }, '')
}

export function initBackGuard() {
  if (initialized) return
  initialized = true
  arm()
  window.addEventListener('popstate', () => {
    const top = stack[stack.length - 1]
    if (top) top.fn()
    arm() // 다시 무장 — 다음 뒤로 가기도 앱 안에서 처리
  })
}

// active가 true인 동안 '뒤로 가기' 한 번을 fn으로 처리
export function useBackClose(active, fn) {
  const ref = useRef(fn)
  ref.current = fn
  useEffect(() => {
    if (!active) return
    const entry = { fn: () => ref.current() }
    stack.push(entry)
    return () => {
      const i = stack.indexOf(entry)
      if (i >= 0) stack.splice(i, 1)
    }
  }, [active])
}

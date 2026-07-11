import { useState } from 'react'
import { hashText } from '../lib/compat.js'

const PIN_KEY = 'contract.pinHash'

// 인트라넷(HTTP) 접속에서도 동작하도록 compat의 해시 사용
function hashPin(pin) {
  return hashText(`jumpoline-contract:${pin}`)
}

export function hasPin() {
  return Boolean(localStorage.getItem(PIN_KEY))
}

export async function savePin(pin) {
  localStorage.setItem(PIN_KEY, await hashPin(pin))
}

// 내부 전용 간단 PIN 잠금 (4자리) — 최초 실행 시 설정, 이후 잠금 해제
export default function PinLock({ onUnlock }) {
  const setupMode = !hasPin()
  const [pin, setPin] = useState('')
  const [firstPin, setFirstPin] = useState(null) // 설정 모드: 첫 입력 보관
  const [error, setError] = useState('')
  const [shaking, setShaking] = useState(false)

  const title = setupMode
    ? (firstPin ? 'PIN 한 번 더 입력' : '사용할 PIN 4자리 설정')
    : 'PIN 입력'

  async function handleDigit(d) {
    if (pin.length >= 4) return
    const next = pin + d
    setPin(next)
    setError('')
    if (next.length < 4) return

    if (setupMode) {
      if (!firstPin) {
        setFirstPin(next)
        setPin('')
      } else if (firstPin === next) {
        await savePin(next)
        onUnlock()
      } else {
        setFirstPin(null)
        setPin('')
        setError('PIN이 일치하지 않아요. 처음부터 다시 설정해 주세요.')
        shake()
      }
      return
    }

    const ok = (await hashPin(next)) === localStorage.getItem(PIN_KEY)
    if (ok) {
      onUnlock()
    } else {
      setPin('')
      setError('PIN이 맞지 않아요.')
      shake()
    }
  }

  function shake() {
    setShaking(true)
    setTimeout(() => setShaking(false), 400)
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-slate-50 px-6">
      <div className="text-2xl font-bold text-gray-900">점포라인 계약서</div>
      <p className="mt-2 text-sm text-gray-500">{title}</p>

      <div className={`mt-6 flex gap-4 ${shaking ? 'animate-bounce' : ''}`}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} className={`h-4 w-4 rounded-full ${i < pin.length ? 'bg-blue-600' : 'bg-gray-300'}`} />
        ))}
      </div>
      {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

      <div className="mt-8 grid w-64 grid-cols-3 gap-3">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, null, 0, 'del'].map((key, idx) =>
          key === null ? (
            <div key={idx} />
          ) : key === 'del' ? (
            <button
              key={idx}
              onClick={() => setPin(p => p.slice(0, -1))}
              className="h-16 rounded-2xl bg-white text-lg font-semibold text-gray-500 shadow-sm active:bg-gray-100"
            >
              ⌫
            </button>
          ) : (
            <button
              key={idx}
              onClick={() => handleDigit(String(key))}
              className="h-16 rounded-2xl bg-white text-xl font-bold text-gray-900 shadow-sm active:bg-blue-50"
            >
              {key}
            </button>
          ),
        )}
      </div>
    </div>
  )
}

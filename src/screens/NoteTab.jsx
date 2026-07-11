import { useEffect, useRef, useState } from 'react'
import { loadCardBoard, saveCardBoard } from '../lib/boardStore.js'

export default function NoteTab({ cardKey }) {
  const [note, setNote] = useState('')
  const [loaded, setLoaded] = useState(false)
  const saveTimer = useRef(null)

  useEffect(() => {
    setLoaded(false)
    if (!cardKey) return
    loadCardBoard(cardKey)
      .then(board => { setNote(board?.note || ''); setLoaded(true) })
      .catch(() => setLoaded(true))
  }, [cardKey])

  function handleChange(e) {
    const val = e.target.value
    setNote(val)
    if (!cardKey) return
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      const board = await loadCardBoard(cardKey).catch(() => null)
      await saveCardBoard(cardKey, { ...(board || {}), note: val })
    }, 500)
  }

  if (!cardKey) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 px-8 text-center">
        <p className="text-4xl">📋</p>
        <p className="text-sm font-semibold text-gray-400">매물카드에서 카드를 먼저 열어주세요</p>
        <p className="text-xs text-gray-300">카드를 열면 이 탭에서 노트를 작성할 수 있어요</p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="border-b border-gray-100 px-4 py-3">
        <p className="text-sm font-bold text-gray-700">노트</p>
        <p className="text-xs text-gray-400">캡처·포스트잇과 함께 이 카드에 저장됩니다</p>
      </div>
      <textarea
        value={loaded ? note : ''}
        onChange={handleChange}
        disabled={!loaded}
        placeholder={loaded ? '자유롭게 메모하세요…' : '불러오는 중…'}
        className="flex-1 resize-none p-4 text-base leading-relaxed text-gray-900 placeholder:text-gray-300 focus:outline-none disabled:bg-gray-50"
      />
    </div>
  )
}

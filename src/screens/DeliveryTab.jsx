import { useEffect, useState } from 'react'
import Complete from './Complete.jsx'
import ContractList from './ContractList.jsx'
import { listCardBoards, deleteCardBoard, patchCardBoard } from '../lib/boardStore.js'
import { copyText } from '../lib/share.js'

// [전달·결제] 탭 — 방금 서명 완료된 계약의 공유·바로결제
//  + 작업 보관함: 매물별로 캡처·메모·노트·수수료·광고문 등 작업된 모든 것을 불러온다
//  + 계약 목록: 서명 완료된 계약서 PDF 재다운로드/재전달 (Supabase)
export default function DeliveryTab({ result, onNewContract, onOpenCard }) {
  return (
    <div className="h-full overflow-y-auto">
      {result ? (
        <Complete result={result} onNewContract={onNewContract} />
      ) : (
        <div className="mx-auto mt-6 max-w-2xl px-4">
          <p className="rounded-2xl bg-card px-4 py-6 text-center text-sm text-fg-hint shadow-card">
            방금 완료된 계약이 없어요 — 계약 탭에서 서명이 끝나면 여기로 넘어옵니다.
          </p>
        </div>
      )}

      {/* 작업 보관함 — 매물별 작업물 전체 */}
      <div className="mx-auto max-w-2xl px-4 pb-2 pt-6">
        <h2 className="px-1 text-sm font-extrabold text-fg">작업 보관함 <span className="text-xs font-normal text-fg-hint">(매물별 캡처·메모·노트·수수료·광고)</span></h2>
      </div>
      <WorkArchive onOpenCard={onOpenCard} />

      <div className="mx-auto max-w-2xl px-4 pb-4 pt-6">
        <h2 className="px-1 text-sm font-extrabold text-fg">계약 목록 · 재전달</h2>
      </div>
      <ContractList />
    </div>
  )
}

// ── 작업 보관함 ──────────────────────────────────────────────
// 보드에 저장된 모든 작업물을 요약 배지로 보여주고, [열기]로 그 매물을 전 탭에 불러온다
function WorkArchive({ onOpenCard }) {
  const [boards, setBoards] = useState([])
  const [loading, setLoading] = useState(true)
  const [copiedKey, setCopiedKey] = useState(null)
  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected] = useState(() => new Set())

  useEffect(() => {
    listCardBoards()
      .then(b => setBoards(b.filter(entry => entry.image)))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // 파일 이름 = 직접 지은 이름 > 매물상호
  const entryName = entry => entry.title || entry.info?.storeName || '상호 미확인'

  async function remove(entry) {
    if (!confirm(`'${entryName(entry)}' 작업을 삭제할까요? (캡처·메모·노트·광고가 함께 삭제됩니다)`)) return
    await deleteCardBoard(entry.key).catch(() => {})
    setBoards(bs => bs.filter(b => b.key !== entry.key))
  }

  // 이름 직접 지정 — 상호가 안 읽힌 옛 보드 정리용
  function rename(entry) {
    const name = prompt('파일 이름 (매물상호)', entryName(entry) === '상호 미확인' ? '' : entryName(entry))
    if (name === null) return
    const title = name.trim() || null
    patchCardBoard(entry.key, { title }).catch(() => {})
    setBoards(bs => bs.map(b => (b.key === entry.key ? { ...b, title } : b)))
  }

  function toggleSelect(key) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function exitSelect() {
    setSelectMode(false)
    setSelected(new Set())
  }

  async function deleteSelected() {
    if (selected.size === 0) return
    if (!confirm(`선택한 ${selected.size}개 작업을 삭제할까요? (캡처·메모·노트·광고가 함께 삭제됩니다)`)) return
    for (const key of selected) await deleteCardBoard(key).catch(() => {})
    setBoards(bs => bs.filter(b => !selected.has(b.key)))
    exitSelect()
  }

  async function copyAd(entry) {
    if (await copyText(entry.ad.generated)) {
      setCopiedKey(entry.key)
      setTimeout(() => setCopiedKey(null), 2000)
    }
  }

  function badges(entry) {
    const list = []
    list.push('캡처')
    if (entry.notes?.length) list.push(`메모 ${entry.notes.length}`)
    if (entry.ink?.strokes?.length || entry.note?.trim()) list.push('노트')
    if (entry.fee && (entry.fee.deposit || entry.fee.monthlyRent || entry.fee.premium)) list.push('수수료')
    if (entry.info) list.push('매물정보')
    if (entry.ad?.generated) list.push('광고문')
    return list
  }

  return (
    <div className="mx-auto max-w-2xl space-y-3 px-4">
      {loading && <p className="py-6 text-center text-sm text-fg-hint">불러오는 중…</p>}
      {!loading && boards.length === 0 && (
        <p className="rounded-2xl bg-card px-4 py-6 text-center text-sm text-fg-hint shadow-card">
          저장된 작업이 없어요 — 매물카드 탭에서 캡처를 시작해 보세요.
        </p>
      )}

      {!loading && boards.length > 0 && (
        <div className="flex items-center justify-end gap-1.5">
          {selectMode ? (
            <>
              <button onClick={() => setSelected(selected.size === boards.length ? new Set() : new Set(boards.map(b => b.key)))}
                className="rounded-full bg-chip px-3 py-1.5 text-xs font-bold text-fg-2 active:opacity-80">
                {selected.size === boards.length ? '전체 해제' : '전체 선택'}
              </button>
              <button onClick={deleteSelected} disabled={selected.size === 0}
                className="rounded-full bg-danger-container px-3 py-1.5 text-xs font-bold text-on-danger-container active:opacity-80 disabled:opacity-40">
                선택 삭제 ({selected.size})
              </button>
              <button onClick={exitSelect} className="rounded-full bg-chip px-3 py-1.5 text-xs font-bold text-fg-2 active:opacity-80">취소</button>
            </>
          ) : (
            <button onClick={() => setSelectMode(true)}
              className="rounded-full bg-chip px-3.5 py-1.5 text-xs font-bold text-fg-2 active:opacity-80">
              선택
            </button>
          )}
        </div>
      )}

      {boards.map(entry => (
        <div key={entry.key}
          onClick={selectMode ? () => toggleSelect(entry.key) : undefined}
          className={`relative flex items-center gap-3 rounded-2xl bg-card p-3 shadow-card ${
            selectMode ? 'cursor-pointer' : ''
          } ${selectMode && selected.has(entry.key) ? 'ring-2 ring-primary' : ''}`}>
          {selectMode ? (
            <span className={`absolute -right-1.5 -top-1.5 flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold shadow-card ${
              selected.has(entry.key) ? 'bg-primary text-on-primary' : 'bg-chip text-fg-hint'
            }`}>
              {selected.has(entry.key) ? '✓' : ''}
            </span>
          ) : (
            <button onClick={() => remove(entry)} aria-label="작업 삭제"
              className="absolute -right-1.5 -top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-chip text-xs font-bold text-fg-2 shadow-card active:bg-danger-container active:text-on-danger-container">
              ✕
            </button>
          )}
          <img src={entry.image} alt="" className="h-16 w-24 shrink-0 rounded-lg object-cover" />
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-sm font-extrabold text-fg">
              <span className="truncate">{entryName(entry)}</span>
              {!selectMode && (
                <button onClick={() => rename(entry)} aria-label="이름 변경"
                  className="shrink-0 rounded-full bg-chip px-2 py-0.5 text-[10px] font-bold text-fg-2 active:opacity-80">
                  ✎ 이름
                </button>
              )}
            </p>
            <p className="mt-0.5 truncate text-[11px] text-fg-hint">
              {entry.capturedAt ? new Date(entry.capturedAt).toLocaleString('ko-KR') : ''}
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {badges(entry).map(b => (
                <span key={b} className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  b === '광고문' ? 'bg-opt-container text-on-opt-container' : 'bg-chip text-fg-2'
                }`}>
                  {b}
                </span>
              ))}
            </div>
          </div>
          {!selectMode && (
            <div className="flex shrink-0 flex-col gap-1.5">
              <button onClick={() => onOpenCard?.(entry.key)}
                className="rounded-full bg-primary px-4 py-2 text-xs font-bold text-on-primary active:opacity-90">
                열기
              </button>
              {entry.ad?.generated && (
                <button onClick={() => copyAd(entry)}
                  className="rounded-full bg-opt-container px-4 py-2 text-xs font-bold text-on-opt-container active:opacity-80">
                  {copiedKey === entry.key ? '✓ 복사됨' : '광고 복사'}
                </button>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

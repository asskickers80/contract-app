import { useEffect, useRef, useState } from 'react'
import CategoryPicker from '../components/CategoryPicker.jsx'
import CaptureBoard from '../components/CaptureBoard.jsx'
import { loadCardBoard, saveCardBoard, listCardBoards, deleteCardBoard } from '../lib/boardStore.js'
import { formatPhone, formatBizNo, formatComma, parseAmount, digitsOnly } from '../lib/format.js'
import { findCardByPhone, saveCard, listCards, isSupabaseConfigured } from '../lib/customerStore.js'

const CUSTOMER_TYPES = ['양도자', '임차인', '기타']

const emptyCard = () => ({
  customer: { id: null, phone: '', name: '', type: '기타' },
  listing: { id: null, storeName: '', businessType: '', bizNo: '', address: '', deposit: 0, monthlyRent: 0, premium: 0, maintenanceFee: 0 },
})

// ── 메인 ─────────────────────────────────────────────────────
export default function ListingTab({ onActiveCard }) {
  const [view, setView] = useState('home') // home | library | card
  const [card, setCard] = useState(null)
  const [isNew, setIsNew] = useState(false)
  const [initImage, setInitImage] = useState(null) // 신규 진입 시 선택한 이미지

  // 전화번호가 바뀔 때 노트 탭에 현재 카드 키 전달
  useEffect(() => {
    if (view !== 'card') return
    onActiveCard?.(digitsOnly(card?.customer?.phone || '') || null)
  }, [view, card?.customer?.phone])

  function openCard(c, fresh, img = null) {
    setCard(c)
    setIsNew(fresh)
    setInitImage(img)
    setView('card')
  }

  function goHome() {
    setView('home')
    setCard(null)
    setInitImage(null)
    onActiveCard?.(null)
  }

  if (view === 'card' && card) {
    return (
      <CardEditor
        card={card}
        isNew={isNew}
        initImage={initImage}
        onChange={setCard}
        onBack={goHome}
      />
    )
  }

  if (view === 'library') {
    return <LibraryScreen onOpen={openCard} onBack={goHome} />
  }

  return <HomeScreen onNew={openCard} onLibrary={() => setView('library')} />
}

// ── 홈: 신규 / 불러오기 ──────────────────────────────────────
function HomeScreen({ onNew, onLibrary }) {
  const fileRef = useRef()

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => onNew(emptyCard(), true, ev.target.result)
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 px-8">
      <h1 className="text-2xl font-bold text-gray-800">매물카드</h1>
      <p className="text-sm text-gray-400">새 카드를 만들거나 저장된 항목을 불러오세요</p>

      <div className="flex w-full max-w-sm flex-col gap-4">
        <button
          onClick={() => fileRef.current?.click()}
          className="flex flex-col items-center gap-2 rounded-2xl bg-blue-600 px-6 py-8 text-white active:bg-blue-700"
        >
          <span className="text-4xl">📷</span>
          <span className="text-lg font-bold">신규</span>
          <span className="text-xs opacity-80">사진첩에서 이미지를 선택해 새 카드를 만들어요</span>
        </button>

        <button
          onClick={onLibrary}
          className="flex flex-col items-center gap-2 rounded-2xl bg-white px-6 py-8 shadow-sm active:bg-gray-50"
        >
          <span className="text-4xl">📁</span>
          <span className="text-lg font-bold text-gray-800">불러오기</span>
          <span className="text-xs text-gray-400">저장된 카드와 캡처 이미지를 확인해요</span>
        </button>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  )
}

// ── 불러오기 라이브러리 ──────────────────────────────────────
function LibraryScreen({ onOpen, onBack }) {
  const [tab, setTab] = useState('cards') // cards | captures
  const [cards, setCards] = useState([])
  const [captures, setCaptures] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [c, b] = await Promise.all([
          isSupabaseConfigured ? listCards('') : Promise.resolve([]),
          listCardBoards(),
        ])
        setCards(c)
        setCaptures(b.filter(b => b.image))
      } catch { /* ignore */ }
      setLoading(false)
    }
    load()
  }, [])

  async function openCardRow(row) {
    const board = await loadCardBoard(digitsOnly(row.customers?.phone || '')).catch(() => null)
    onOpen({
      customer: { id: row.customers?.id, phone: formatPhone(row.customers?.phone || ''), name: row.customers?.name || '', type: row.customers?.type || '기타' },
      listing: {
        id: row.id, storeName: row.store_name || '', businessType: row.business_type || '',
        bizNo: row.biz_reg_no || '', address: row.address || '',
        deposit: row.deposit || 0, monthlyRent: row.monthly_rent || 0,
        premium: row.premium || 0, maintenanceFee: row.maintenance_fee || 0,
      },
    }, false, board?.image || null)
  }

  async function openCapture(entry) {
    // 전화번호 키가 있으면 해당 카드도 함께 로드, 없으면 빈 카드
    let card = emptyCard()
    if (entry.key && isSupabaseConfigured) {
      try {
        const found = await findCardByPhone(entry.key)
        if (found) {
          card = {
            customer: { id: found.customer.id, phone: formatPhone(found.customer.phone), name: found.customer.name || '', type: found.customer.type || '기타' },
            listing: found.listing ? {
              id: found.listing.id, storeName: found.listing.store_name || '',
              businessType: found.listing.business_type || '', bizNo: found.listing.biz_reg_no || '',
              address: found.listing.address || '', deposit: found.listing.deposit || 0,
              monthlyRent: found.listing.monthly_rent || 0, premium: found.listing.premium || 0,
              maintenanceFee: found.listing.maintenance_fee || 0,
            } : emptyCard().listing,
          }
        }
      } catch { /* 빈 카드로 */ }
    }
    onOpen(card, !card.customer.id, entry.image)
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-gray-200 bg-white px-4 py-3">
        <button onClick={onBack} className="rounded-xl px-3 py-1.5 text-sm font-bold text-gray-500 active:bg-gray-100">← 뒤로</button>
        <span className="font-bold text-gray-900">불러오기</span>
      </div>

      <div className="flex border-b border-gray-200 bg-white">
        {[['cards', '매물카드'], ['captures', '캡처 이미지']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex-1 py-3 text-sm font-bold ${tab === key ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-400'}`}>
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto pb-6">
        {loading && <p className="py-10 text-center text-sm text-gray-300">불러오는 중…</p>}

        {!loading && tab === 'cards' && (
          <div className="mx-auto max-w-2xl space-y-2 p-4">
            {!isSupabaseConfigured && (
              <p className="rounded-xl bg-amber-50 px-4 py-2.5 text-xs text-amber-800">Supabase 미설정 — 카드 목록을 사용하려면 .env 설정이 필요해요</p>
            )}
            {cards.length === 0 && <p className="py-10 text-center text-sm text-gray-300">저장된 카드가 없어요</p>}
            {cards.map(row => (
              <button key={row.id} onClick={() => openCardRow(row)}
                className="block w-full rounded-xl border border-gray-100 bg-white px-4 py-3 text-left shadow-sm active:bg-blue-50">
                <div className="flex items-baseline justify-between">
                  <span className="font-bold text-gray-900">{row.store_name || '(상호 미입력)'}</span>
                  <span className="text-xs text-gray-400">{formatPhone(row.customers?.phone || '')}</span>
                </div>
                <div className="mt-0.5 text-xs text-gray-400">
                  {row.customers?.name || '이름 미입력'} · {row.customers?.type || '기타'} · {row.business_type || '업종 미정'}
                </div>
              </button>
            ))}
          </div>
        )}

        {!loading && tab === 'captures' && (
          <div className="mx-auto max-w-2xl p-4">
            {captures.length === 0 && <p className="py-10 text-center text-sm text-gray-300">저장된 캡처 이미지가 없어요</p>}
            <div className="grid grid-cols-2 gap-3">
              {captures.map(entry => (
                <button key={entry.key} onClick={() => openCapture(entry)}
                  className="relative overflow-hidden rounded-xl bg-white shadow-sm active:opacity-80">
                  <img src={entry.image} alt="" className="aspect-[4/3] w-full object-cover" />
                  <div className="p-2 text-left">
                    <p className="text-xs font-semibold text-gray-700">{entry.key ? formatPhone(entry.key) : '전화번호 없음'}</p>
                    <p className="text-[11px] text-gray-400">
                      {entry.capturedAt ? new Date(entry.capturedAt).toLocaleDateString('ko-KR') : ''}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── 카드 편집 ────────────────────────────────────────────────
function CardEditor({ card, isNew, initImage, onChange, onBack }) {
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState(null)

  const boardKey = digitsOnly(card.customer.phone)
  const [board, setBoard] = useState(null)

  useEffect(() => {
    if (boardKey) {
      loadCardBoard(boardKey).then(setBoard).catch(() => {})
    } else if (initImage) {
      // 신규 + 이미지 선택: 보드 초기값으로 세팅
      setBoard({ image: initImage, notes: [], capturedAt: new Date().toISOString() })
    }
  }, [boardKey, initImage])

  useEffect(() => {
    if (!board || !boardKey) return
    const t = setTimeout(() => saveCardBoard(boardKey, board).catch(() => {}), 400)
    return () => clearTimeout(t)
  }, [board, boardKey])

  const setCustomer = patch => onChange({ ...card, customer: { ...card.customer, ...patch } })
  const setListing  = patch => onChange({ ...card, listing:  { ...card.listing,  ...patch } })

  async function handleSave() {
    if (!card.customer.phone) { setNotice({ ok: false, text: '전화번호를 입력해 주세요' }); return }
    setSaving(true); setNotice(null)
    try {
      const key = digitsOnly(card.customer.phone)
      // 이미지 있으면 보드 저장
      if (board?.image) await saveCardBoard(key, board).catch(() => {})
      const { customerId, listingId } = await saveCard(card)
      onChange({ customer: { ...card.customer, id: customerId }, listing: { ...card.listing, id: listingId } })
      setNotice({ ok: true, text: '저장되었습니다' })
    } catch (err) {
      setNotice({ ok: false, text: `저장 실패: ${err.message || err}` })
    } finally {
      setSaving(false)
    }
  }

  // 신규 카드에서 이미지 교체
  const imageFileRef = useRef()
  function handleImageChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setBoard(prev => ({ ...(prev || { notes: [] }), image: ev.target.result, capturedAt: new Date().toISOString() }))
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const moneyField = (label, key) => (
    <label className="block">
      <span className="text-xs font-semibold text-gray-500">{label}</span>
      <div className="mt-1 flex items-center gap-1">
        <input type="text" inputMode="numeric" value={formatComma(card.listing[key])}
          onChange={e => setListing({ [key]: parseAmount(e.target.value) })}
          className="w-full min-w-0 rounded-xl border border-gray-300 px-2 py-2.5 text-right text-sm focus:border-blue-500 focus:outline-none" />
        <span className="shrink-0 text-xs text-gray-400">원</span>
      </div>
    </label>
  )

  return (
    <div className="h-full overflow-y-auto pb-28">
      {/* 헤더 */}
      <div className="mx-auto mt-4 max-w-2xl px-4">
        <div className="flex items-center justify-between">
          <button onClick={onBack} className="rounded-xl px-3 py-2 text-sm font-bold text-gray-500 active:bg-gray-100">← 목록으로</button>
          <span className="text-sm font-bold text-gray-900">{isNew ? '새 매물카드' : '매물카드'}</span>
          <span className="w-16" />
        </div>
      </div>

      {/* 캡처 이미지 — 전체 폭: 불러온 그림이 앱 화면을 가득 채운다 */}
      <section className="mt-3 bg-white px-2 py-3 shadow-sm">
        <div className="mx-auto mb-2 flex max-w-2xl items-center justify-between px-2">
          <h2 className="text-sm font-bold text-gray-500">캡처 · 메모</h2>
          <button onClick={() => imageFileRef.current?.click()}
            className="rounded-lg bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600 active:bg-gray-200">
            {board?.image ? '이미지 교체' : '이미지 추가'}
          </button>
          <input ref={imageFileRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
        </div>
        {board?.image
          ? <CaptureBoard board={board} onBoardChange={setBoard} />
          : <p className="py-8 text-center text-xs text-gray-300">이미지 추가 버튼으로 사진첩에서 불러올 수 있어요</p>
        }
      </section>

      {/* 폼 */}
      <div className="mx-auto mt-4 max-w-2xl space-y-4 px-4">
        {/* 고객 */}
        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="text-sm font-bold text-gray-500">고객</h2>
          <div className="mt-3 space-y-4">
            <label className="block">
              <span className="text-[13px] font-semibold text-gray-700">전화번호</span>
              <input type="tel" inputMode="numeric" value={card.customer.phone}
                onChange={e => setCustomer({ phone: formatPhone(e.target.value) })}
                placeholder="010-0000-0000"
                className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-3 text-base tracking-wide focus:border-blue-500 focus:outline-none" />
            </label>
            <label className="block">
              <span className="text-[13px] font-semibold text-gray-700">고객명</span>
              <input type="text" value={card.customer.name}
                onChange={e => setCustomer({ name: e.target.value })}
                placeholder="이름 또는 별칭"
                className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-3 text-base focus:border-blue-500 focus:outline-none" />
            </label>
            <div>
              <span className="text-[13px] font-semibold text-gray-700">구분</span>
              <div className="mt-1 flex gap-1.5">
                {CUSTOMER_TYPES.map(t => (
                  <button key={t} onClick={() => setCustomer({ type: t })}
                    className={`flex-1 rounded-xl border-2 py-3 text-sm font-bold ${card.customer.type === t ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600'}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 매물 */}
        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="text-sm font-bold text-gray-500">매물</h2>
          <div className="mt-3 space-y-4">
            <label className="block">
              <span className="text-[13px] font-semibold text-gray-700">상호</span>
              <input type="text" value={card.listing.storeName}
                onChange={e => setListing({ storeName: e.target.value })}
                placeholder="예: 행복분식"
                className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-3 text-base focus:border-blue-500 focus:outline-none" />
            </label>
            <div>
              <span className="text-[13px] font-semibold text-gray-700">업종</span>
              <div className="mt-1">
                <CategoryPicker value={card.listing.businessType} onSelect={v => setListing({ businessType: v })} />
              </div>
            </div>
            <label className="block">
              <span className="text-[13px] font-semibold text-gray-700">사업자등록번호</span>
              <input type="text" inputMode="numeric" value={card.listing.bizNo}
                onChange={e => setListing({ bizNo: formatBizNo(e.target.value) })}
                placeholder="숫자 10자리 (자동 하이픈)"
                className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-3 text-base focus:border-blue-500 focus:outline-none" />
            </label>
            <label className="block">
              <span className="text-[13px] font-semibold text-gray-700">소재지</span>
              <input type="text" value={card.listing.address}
                onChange={e => setListing({ address: e.target.value })}
                placeholder="예: 서울시 강남구 ○○동 123-4"
                className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-3 text-base focus:border-blue-500 focus:outline-none" />
            </label>
          </div>
        </section>

        {/* 거래 조건 */}
        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="text-sm font-bold text-gray-500">거래 조건</h2>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {moneyField('보증금', 'deposit')}
            {moneyField('월세', 'monthlyRent')}
            {moneyField('권리금', 'premium')}
            {moneyField('관리비', 'maintenanceFee')}
          </div>
        </section>

        {notice && (
          <p className={`rounded-xl px-4 py-3 text-sm ${notice.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
            {notice.text}
          </p>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-gray-200 bg-white/95 p-4 backdrop-blur">
        <div className="mx-auto max-w-2xl">
          <button onClick={handleSave} disabled={saving}
            className="w-full rounded-2xl bg-blue-600 py-4 text-base font-bold text-white active:bg-blue-700 disabled:bg-gray-300">
            {saving ? '저장 중…' : '카드 저장'}
          </button>
        </div>
      </div>
    </div>
  )
}

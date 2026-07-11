import { useRef, useState } from 'react'
import ContractPaper from '../components/ContractPaper.jsx'
import SignPad from '../components/SignPad.jsx'
import { HANDWRITTEN_NOTICE, HANDWRITTEN_GUIDE, toSegments } from '../data/contract.js'
import { generateContractPdf } from '../lib/pdf.js'
import { buildPdfFileName, toDateInputValue } from '../lib/format.js'
import { saveContract, isSupabaseConfigured } from '../lib/supabase.js'

// ② 고객 서명 탭 — iPad를 고객에게 전달한 상태
// 계약서를 최하단까지 스크롤해야 서명 영역이 활성화된다. (작성으로 돌아가려면 상단 탭 사용)
export default function SignScreen({ draft, onDone }) {
  const [scrolledToEnd, setScrolledToEnd] = useState(false)
  const [hasHandwriting, setHasHandwriting] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)
  const [customerName, setCustomerName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const handwritingRef = useRef(null)
  const signatureRef = useRef(null)

  function handleScroll(e) {
    const el = e.currentTarget
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 24) setScrolledToEnd(true)
  }

  const canComplete = scrolledToEnd && hasHandwriting && hasSignature && customerName.trim() && !busy

  async function handleComplete() {
    if (!canComplete) return
    setBusy(true)
    setError('')
    try {
      const signedAt = new Date().toISOString()
      const signedDate = toDateInputValue(new Date()) // 기기 기준(현지) 날짜
      const contract = { ...draft, customerName: customerName.trim() }
      const images = {
        handwrittenPng: handwritingRef.current?.toDataURL(),
        signaturePng: signatureRef.current?.toDataURL(),
      }
      const pdfBlob = await generateContractPdf(contract, images, signedDate)
      const fileName = buildPdfFileName(contract.storeName, signedDate)

      // 저장 먼저, 전달은 그다음 — 저장 실패해도 PDF는 살아있으므로 완료 화면에서 재시도
      let savedRow = null
      let saveError = null
      if (isSupabaseConfigured) {
        try {
          savedRow = await saveContract({ pdfBlob, fileName, contract, signedAt })
        } catch (err) {
          saveError = err.message || String(err)
        }
      } else {
        saveError = 'Supabase 미설정 — 저장을 건너뛰었습니다 (.env 설정 필요)'
      }
      onDone({ contract, pdfBlob, fileName, signedAt, savedRow, saveError })
    } catch (err) {
      setError(`PDF 생성에 실패했어요: ${err.message || err}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="pb-10">
      <div className="mx-auto mt-4 max-w-2xl space-y-4 px-4">
        <div className="text-center">
          <p className="text-base font-bold text-gray-900">계약 내용 확인 및 서명</p>
          <p className="mt-0.5 text-xs text-gray-400">iPad를 고객님께 전달해 주세요</p>
        </div>
        {/* 1. 계약서 전문 열람 (스크롤 게이트) */}
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="border-b border-gray-100 px-4 py-3">
            <p className="text-sm font-bold text-gray-900">1. 계약서를 끝까지 읽어 주세요</p>
            <p className="text-xs text-gray-400">아래 상자를 맨 아래까지 스크롤하면 서명 칸이 열립니다.</p>
          </div>
          <div onScroll={handleScroll} className="h-[52dvh] overflow-y-auto overscroll-contain">
            <ContractPaper contract={draft} />
          </div>
          <div className={`px-4 py-2.5 text-center text-sm font-semibold ${scrolledToEnd ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
            {scrolledToEnd ? '✓ 끝까지 확인하셨습니다' : '⌄ 아직 읽지 않은 내용이 있어요'}
          </div>
        </div>

        {/* 2. 자필 확인란 */}
        <div className={`rounded-2xl bg-white p-4 shadow-sm ${scrolledToEnd ? '' : 'opacity-50'}`}>
          <p className="text-sm font-bold text-gray-900">2. 중요내용 확인 (자필)</p>
          <p className="mt-2 rounded-xl bg-red-50 px-3 py-2.5 text-[13px] leading-relaxed text-red-700">
            {toSegments(HANDWRITTEN_NOTICE).map((seg, i) =>
              seg.u ? <u key={i} className="font-semibold underline-offset-2">{seg.text}</u> : <span key={i}>{seg.text}</span>,
            )}
          </p>
          <p className="mt-2 text-xs text-gray-500">{HANDWRITTEN_GUIDE}</p>
          <div className="mt-2">
            <SignPad ref={handwritingRef} height={120} disabled={!scrolledToEnd} onChange={setHasHandwriting} />
          </div>
          <button onClick={() => handwritingRef.current?.clear()} className="mt-2 rounded-lg px-3 py-2 text-sm text-gray-400 underline active:bg-gray-50">
            지우고 다시 쓰기
          </button>
        </div>

        {/* 3. 성명 + 서명 */}
        <div className={`rounded-2xl bg-white p-4 shadow-sm ${scrolledToEnd ? '' : 'opacity-50'}`}>
          <p className="text-sm font-bold text-gray-900">3. 성명과 서명</p>
          <label className="mt-3 block">
            <span className="text-[13px] font-semibold text-gray-700">광고주 성명 <span className="text-red-500">*</span></span>
            <input
              type="text" value={customerName} onChange={e => setCustomerName(e.target.value)}
              disabled={!scrolledToEnd} placeholder="성명을 입력해 주세요"
              className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-3 text-base focus:border-blue-500 focus:outline-none disabled:bg-gray-50"
            />
          </label>
          <p className="mt-3 text-[13px] font-semibold text-gray-700">서명 (인)</p>
          <div className="mt-1">
            <SignPad ref={signatureRef} height={160} disabled={!scrolledToEnd} onChange={setHasSignature} />
          </div>
          <button onClick={() => signatureRef.current?.clear()} className="mt-2 rounded-lg px-3 py-2 text-sm text-gray-400 underline active:bg-gray-50">
            지우고 다시 쓰기
          </button>
        </div>

        {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}

        <button onClick={handleComplete} disabled={!canComplete}
          className="w-full rounded-2xl bg-blue-600 py-4 text-base font-bold text-white active:bg-blue-700 disabled:bg-gray-300">
          {busy ? 'PDF 생성·저장 중…' : '서명 완료'}
        </button>
        {!scrolledToEnd && <p className="text-center text-xs text-gray-400">계약서를 끝까지 읽으면 서명할 수 있어요.</p>}
      </div>
    </div>
  )
}

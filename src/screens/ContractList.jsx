import { useEffect, useState } from 'react'
import { listContracts, downloadContractPdf, isSupabaseConfigured } from '../lib/supabase.js'
import { sharePdf, downloadBlob } from '../lib/share.js'
import { formatKoreanDate } from '../lib/format.js'

// 목록 탭 — 서명 완료 계약 검색(상호), PDF 재다운로드, 재공유
export default function ContractList() {
  const [keyword, setKeyword] = useState('')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)

  async function load(kw) {
    if (!isSupabaseConfigured) {
      setLoading(false)
      setError('Supabase가 설정되지 않아 목록을 불러올 수 없어요. (.env에 VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY 설정)')
      return
    }
    setLoading(true)
    setError('')
    try {
      setRows(await listContracts(kw))
    } catch (err) {
      setError(`목록을 불러오지 못했어요: ${err.message || err}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load('')
  }, [])

  async function withPdf(row, action) {
    setBusyId(row.id)
    try {
      const blob = await downloadContractPdf(row.pdf_path)
      await action(blob, row.file_name || `${row.store_name}.pdf`)
    } catch (err) {
      alert(`PDF를 가져오지 못했어요: ${err.message || err}`)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="pb-10">
      <div className="mx-auto max-w-2xl space-y-3 px-4">
        <form
          onSubmit={e => { e.preventDefault(); load(keyword) }}
          className="flex gap-2"
        >
          <input
            type="search" value={keyword} onChange={e => setKeyword(e.target.value)}
            placeholder="상호로 검색"
            className="flex-1 rounded-xl border border-gray-300 bg-white px-3 py-3 text-base focus:border-blue-500 focus:outline-none"
          />
          <button type="submit" className="rounded-xl bg-gray-900 px-5 text-sm font-bold text-white">검색</button>
        </form>

        {loading && <p className="py-10 text-center text-sm text-gray-400">불러오는 중…</p>}
        {error && <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">{error}</p>}
        {!loading && !error && rows.length === 0 && (
          <p className="py-10 text-center text-sm text-gray-400">저장된 계약서가 없어요.</p>
        )}

        {rows.map(row => (
          <div key={row.id} className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-base font-bold text-gray-900">{row.store_name}</p>
                <p className="mt-0.5 text-xs text-gray-400">
                  {row.business_type} · 총 {Number(row.total || 0).toLocaleString('ko-KR')}원
                </p>
                <p className="mt-0.5 text-xs text-gray-400">
                  개시 {formatKoreanDate(row.start_date)} · 서명 {row.signed_at ? new Date(row.signed_at).toLocaleString('ko-KR') : '—'}
                </p>
                {row.payment_opened_at && <p className="mt-0.5 text-xs text-blue-500">결제 페이지 연 시각: {new Date(row.payment_opened_at).toLocaleString('ko-KR')}</p>}
              </div>
              <div className="flex shrink-0 flex-col gap-2">
                <button
                  onClick={() => withPdf(row, (blob, name) => sharePdf(blob, name))}
                  disabled={busyId === row.id}
                  className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
                >
                  {busyId === row.id ? '…' : '재공유'}
                </button>
                <button
                  onClick={() => withPdf(row, (blob, name) => downloadBlob(blob, name))}
                  disabled={busyId === row.id}
                  className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 disabled:opacity-50"
                >
                  다운로드
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

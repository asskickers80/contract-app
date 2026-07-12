import { useState } from 'react'
import { PAYMENT_URL } from '../data/contract.js'
import { sharePdf, downloadBlob, copyText } from '../lib/share.js'
import { saveContract, markPaymentOpened, isSupabaseConfigured } from '../lib/supabase.js'

// 전달·결제 — 저장 상태 표시 + 공유 시트 + 바로결제 (5번 탭에서 사용)
export default function Complete({ result, onNewContract }) {
  const { contract, pdfBlob, fileName, signedAt } = result
  const [savedRow, setSavedRow] = useState(result.savedRow)
  const [saveError, setSaveError] = useState(result.saveError)
  const [saving, setSaving] = useState(false)
  const [shareStatus, setShareStatus] = useState(null) // 'shared' | 'downloaded' | 'cancelled'
  const [copied, setCopied] = useState(null) // 'amount' | 'reason'

  const totalText = Number(contract.total || 0).toLocaleString('ko-KR')

  async function retrySave() {
    setSaving(true)
    try {
      const row = await saveContract({ pdfBlob, fileName, contract, signedAt })
      setSavedRow(row)
      setSaveError(null)
    } catch (err) {
      setSaveError(err.message || String(err))
    } finally {
      setSaving(false)
    }
  }

  async function handleShare() {
    const status = await sharePdf(pdfBlob, fileName)
    if (status !== 'cancelled') setShareStatus(status)
  }

  async function handleCopy(kind, text) {
    if (await copyText(text)) {
      setCopied(kind)
      setTimeout(() => setCopied(null), 2000)
    }
  }

  function openPayment() {
    // PG 보안 정책상 iframe 삽입 금지 — 반드시 새 창으로 연다
    window.open(PAYMENT_URL, '_blank')
    if (savedRow?.id) markPaymentOpened(savedRow.id)
  }

  return (
    <div className="pb-10">
      <div className="mx-auto max-w-2xl px-4 pt-8">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl">✓</div>
          <h1 className="mt-3 text-xl font-bold text-gray-900">서명이 완료되었습니다</h1>
          <p className="mt-1 text-sm text-gray-500">{fileName}</p>
        </div>

        {/* 저장 상태 */}
        <div className={`mt-6 rounded-2xl px-4 py-3.5 text-sm ${savedRow ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-800'}`}>
          {savedRow ? (
            '✓ 계약서가 저장되었습니다.'
          ) : (
            <div className="flex items-center justify-between gap-3">
              <span>저장 안 됨: {saveError}</span>
              {isSupabaseConfigured && (
                <button onClick={retrySave} disabled={saving}
                  className="shrink-0 rounded-lg bg-amber-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">
                  {saving ? '저장 중…' : '다시 저장'}
                </button>
              )}
            </div>
          )}
        </div>

        {/* 고객에게 보내기 */}
        <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-sm font-bold text-gray-900">고객에게 계약서 보내기</p>
          <p className="mt-1 text-xs text-gray-400">전달 버튼을 누르면 카카오톡·문자·메일·AirDrop 중에서 고를 수 있어요.</p>
          <button onClick={handleShare}
            className="mt-3 w-full rounded-2xl bg-blue-600 py-4 text-base font-bold text-white active:bg-blue-700">
            고객에게 보내기 (전달)
          </button>
          {shareStatus === 'shared' && <p className="mt-2 text-center text-sm font-semibold text-green-600">✓ 전달을 완료했어요</p>}
          {shareStatus === 'downloaded' && (
            <p className="mt-2 text-center text-xs text-amber-600">
              전달 창 대신 PDF를 다운로드했어요. 파일 앱에서 직접 전달해 주세요.
              (인트라넷 http 주소에서는 iPad 보안 정책상 전달 창이 안 열려요 — 나중에 HTTPS로 배포하면 열립니다)
            </p>
          )}
          <button onClick={() => downloadBlob(pdfBlob, fileName)}
            className="mt-2 w-full rounded-xl py-2.5 text-sm text-gray-400 underline active:bg-gray-50">
            PDF 다운로드
          </button>
        </div>

        {/* 광고료 결제 */}
        <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-sm font-bold text-gray-900">광고료 결제</p>
          <div className="mt-2 rounded-xl bg-slate-50 px-4 py-3 text-center">
            <p className="text-xs text-gray-400">결제할 총액</p>
            <p className="text-3xl font-bold text-gray-900">{totalText}<span className="text-base font-semibold">원</span></p>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button onClick={() => handleCopy('amount', String(contract.total))}
              className="rounded-xl border border-gray-200 py-3 text-sm font-semibold text-gray-700 active:bg-gray-50">
              {copied === 'amount' ? '✓ 복사됨' : '금액 복사'}
            </button>
            <button onClick={() => handleCopy('reason', `매물광고료 - ${contract.storeName}`)}
              className="rounded-xl border border-gray-200 py-3 text-sm font-semibold text-gray-700 active:bg-gray-50">
              {copied === 'reason' ? '✓ 복사됨' : '결제사유(상호) 복사'}
            </button>
          </div>
          <button onClick={openPayment}
            className="mt-2 w-full rounded-2xl bg-gray-900 py-4 text-base font-bold text-white active:bg-gray-700">
            광고료 결제하기 (점포라인 바로결제)
          </button>
          <p className="mt-2 text-xs leading-relaxed text-gray-400">
            결제 페이지에는 금액이 자동으로 들어가지 않아요. 위 버튼으로 금액과 결제사유를 복사한 뒤, 결제 페이지에서 붙여넣어 주세요.
          </p>
        </div>

        <div className="mt-6">
          <button onClick={onNewContract} className="w-full rounded-2xl border-2 border-blue-600 py-3.5 text-sm font-bold text-blue-600 active:bg-blue-50">
            + 새 계약서 작성 (계약 탭으로)
          </button>
        </div>
      </div>
    </div>
  )
}

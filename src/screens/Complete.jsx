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
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-ok text-2xl text-on-ok">✓</div>
          <h1 className="mt-3 text-[19px] font-extrabold text-fg">서명이 완료되었습니다</h1>
          <p className="mt-1 text-[12.5px] text-fg-2">{fileName}</p>
        </div>

        {/* 저장 상태 */}
        <div className={`mt-6 rounded-xl px-4 py-3 text-[12.5px] font-bold ${savedRow ? 'bg-ok text-on-ok' : 'bg-warn text-on-warn'}`}>
          {savedRow ? (
            '✓ 계약서가 저장되었습니다.'
          ) : (
            <div className="flex items-center justify-between gap-3">
              <span>저장 안 됨: {saveError}</span>
              {isSupabaseConfigured && (
                <button onClick={retrySave} disabled={saving}
                  className="shrink-0 rounded-full bg-on-warn px-3.5 py-2 text-xs font-bold text-warn disabled:opacity-50">
                  {saving ? '저장 중…' : '다시 저장'}
                </button>
              )}
            </div>
          )}
        </div>

        {/* 고객에게 보내기 · 광고료 결제 — iPad 가로에서 2열 */}
        <div className="mt-4 grid gap-3 sm:grid-cols-2 sm:items-stretch">
        <div className="flex flex-col rounded-2xl bg-card p-4 shadow-card">
          <p className="text-sm font-extrabold text-fg">고객에게 계약서 보내기</p>
          <p className="mt-1 text-xs leading-relaxed text-fg-2">전달 버튼을 누르면 카카오톡·문자·메일·AirDrop 중에서 고를 수 있어요.</p>
          <button onClick={handleShare}
            className="mt-auto w-full rounded-full bg-primary py-3.5 text-sm font-bold text-on-primary active:opacity-90">
            고객에게 보내기 (전달)
          </button>
          {shareStatus === 'shared' && <p className="mt-2 text-center text-sm font-semibold text-on-ok">✓ 전달을 완료했어요</p>}
          {shareStatus === 'downloaded' && (
            <p className="mt-2 text-center text-xs text-on-warn">
              전달 창 대신 PDF를 다운로드했어요. 파일 앱에서 직접 전달해 주세요.
              (인트라넷 http 주소에서는 iPad 보안 정책상 전달 창이 안 열려요 — 나중에 HTTPS로 배포하면 열립니다)
            </p>
          )}
          <button onClick={() => downloadBlob(pdfBlob, fileName)}
            className="mt-2 w-full rounded-full py-2.5 text-[12.5px] font-semibold text-primary underline underline-offset-2 active:bg-chip">
            PDF 다운로드
          </button>
        </div>

        {/* 광고료 결제 */}
        <div className="flex flex-col rounded-2xl bg-card p-4 shadow-card">
          <p className="text-sm font-extrabold text-fg">광고료 결제</p>
          <div className="mt-2 rounded-xl bg-field px-4 py-3 text-center">
            <p className="text-[11px] text-fg-2">결제할 총액</p>
            <p className="text-[22px] font-extrabold text-fg">
              {totalText}<span className="text-[13px] font-semibold">원</span>
              <span className="ml-1.5 align-middle text-[11px] font-normal text-fg-hint">(부가세 포함)</span>
            </p>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button onClick={() => handleCopy('amount', String(contract.total))}
              className="rounded-full bg-chip py-3 text-[12.5px] font-bold text-primary active:opacity-80">
              {copied === 'amount' ? '✓ 복사됨' : '금액 복사'}
            </button>
            <button onClick={() => handleCopy('reason', `매물광고료 - ${contract.storeName}`)}
              className="rounded-full bg-chip py-3 text-[12.5px] font-bold text-primary active:opacity-80">
              {copied === 'reason' ? '✓ 복사됨' : '결제사유(상호) 복사'}
            </button>
          </div>
          {/* 광고료 입금계좌 (2026-07-13 대표님 지시) */}
          <div className="mt-2 rounded-full bg-chip px-4 py-2.5 text-center text-[12.5px] font-bold leading-snug text-primary">
            광고료 입금계좌 : 우리은행 1005-701-333816
            <span className="block text-[11.5px] font-semibold">예금주 : (주)점포라인</span>
          </div>
          <button onClick={openPayment}
            className="mt-2 w-full rounded-full bg-cta py-3.5 text-[13px] font-bold text-on-cta active:opacity-90">
            광고료 결제하기 (점포라인 바로결제)
          </button>
        </div>
        </div>

        <div className="mt-6">
          <button onClick={onNewContract} className="w-full rounded-full border border-line-strong bg-card py-3 text-[13px] font-bold text-primary active:bg-chip">
            + 새 계약서 작성 (계약 탭으로)
          </button>
        </div>
      </div>
    </div>
  )
}

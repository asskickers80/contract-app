import Complete from './Complete.jsx'
import ContractList from './ContractList.jsx'

// 5번 탭 [전달·결제] — 방금 서명 완료된 계약의 공유·바로결제 + 계약 목록(재다운로드/재공유)
export default function DeliveryTab({ result, onNewContract }) {
  return (
    <div className="h-full overflow-y-auto">
      {result ? (
        <Complete result={result} onNewContract={onNewContract} />
      ) : (
        <div className="mx-auto mt-6 max-w-2xl px-4">
          <p className="rounded-2xl bg-card px-4 py-6 text-center text-sm text-fg-hint shadow-card">
            방금 완료된 계약이 없어요 — 계약 탭에서 서명이 끝나면 여기로 넘어옵니다.
            <br />지난 계약은 아래 목록에서 재전달할 수 있어요.
          </p>
        </div>
      )}

      <div className="mx-auto max-w-2xl px-4 pb-4 pt-6">
        <h2 className="px-1 text-sm font-extrabold text-fg">계약 목록 · 재전달</h2>
      </div>
      <ContractList />
    </div>
  )
}

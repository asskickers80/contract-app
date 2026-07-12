import { useState } from 'react'
import SplashScreen from './screens/SplashScreen.jsx'
import PinLock from './screens/PinLock.jsx'
import AppTabs, { APP_TABS } from './components/AppTabs.jsx'
import ListingTab from './screens/ListingTab.jsx'
import NoteTab from './screens/NoteTab.jsx'
import ContractTab from './screens/ContractTab.jsx'
import DeliveryTab from './screens/DeliveryTab.jsx'

// [0 매물카드] [1 노트] [2 계약] [3 전달·결제]
// 천하통일(인트라넷) 탭 완전 제거 (2026-07-11 대표님 결정)

export default function App() {
  const [splashDone, setSplashDone] = useState(sessionStorage.getItem('contract.splashDone') === '1')
  const [unlocked, setUnlocked] = useState(sessionStorage.getItem('contract.unlocked') === '1')
  const [active, setActive] = useState(0)
  const [activeCardKey, setActiveCardKey] = useState(null)
  const [contractResult, setContractResult] = useState(null)
  const [contractKey, setContractKey] = useState(0)

  function handleContractComplete(result) {
    setContractResult(result)
    setContractKey(k => k + 1)
    setActive(3)
  }

  function handleNewContract() {
    setContractResult(null)
    setActive(2)
  }

  if (!splashDone) {
    return (
      <SplashScreen
        onDone={() => {
          sessionStorage.setItem('contract.splashDone', '1')
          setSplashDone(true)
        }}
      />
    )
  }

  if (!unlocked) {
    return (
      <PinLock
        onUnlock={() => {
          sessionStorage.setItem('contract.unlocked', '1')
          setUnlocked(true)
        }}
      />
    )
  }

  return (
    <div className="flex h-dvh flex-col bg-slate-100">
      <AppTabs active={active} onSelect={setActive} />
      <div className="min-h-0 flex-1">
        <div className={active === 0 ? 'h-full' : 'hidden'}>
          <ListingTab onActiveCard={setActiveCardKey} />
        </div>
        {active === 1 && <NoteTab cardKey={activeCardKey} />}
        <div className={active === 2 ? 'h-full' : 'hidden'}>
          <ContractTab key={contractKey} cardKey={activeCardKey} active={active === 2} onComplete={handleContractComplete} />
        </div>
        {active === 3 && <DeliveryTab result={contractResult} onNewContract={handleNewContract} />}
      </div>
    </div>
  )
}

function Placeholder({ label }) {
  return (
    <div className="flex h-full flex-col items-center justify-center text-gray-300">
      <p className="text-sm font-semibold">{label} — 준비 중</p>
    </div>
  )
}

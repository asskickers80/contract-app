import { useState } from 'react';
import { ContractProvider } from './context/ContractContext';
import SplashScreen from './screens/SplashScreen';
import PinLock from './screens/PinLock';
import IntranetTab from './screens/IntranetTab';
import ListingsTab from './screens/ListingsTab';
import SettingsTab from './screens/SettingsTab';
import Step1Form from './screens/Step1Form';
import Step2Sign from './screens/Step2Sign';
import Step3Done from './screens/Step3Done';
import ContractList from './screens/ContractList';

const TABS = [
  { key: 'intranet', label: '인트라넷' },
  { key: 'listings', label: '매물카드' },
  { key: 'contract', label: '계약서' },
  { key: 'settings', label: '설정' },
];

export default function App() {
  const [splash, setSplash] = useState(true);
  const [auth, setAuth] = useState(false);
  const [tab, setTab] = useState('intranet');
  const [contractScreen, setContractScreen] = useState('step1'); // step1 | step2 | step3 | list

  if (splash) {
    return <SplashScreen onDone={() => setSplash(false)} />;
  }

  if (!auth) {
    return <PinLock onUnlock={() => setAuth(true)} />;
  }

  // 서명·완료 화면에서는 탭바 숨김 (고객 앞 화면)
  const hideTabBar = tab === 'contract' && (contractScreen === 'step2' || contractScreen === 'step3');

  return (
    <ContractProvider>
      {!hideTabBar && (
        <nav className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 z-50 flex safe-area-bottom">
          {TABS.map(t => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`flex-1 py-4 text-base font-semibold transition ${
                tab === t.key ? 'text-blue-400' : 'text-gray-500'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      )}

      <div className={hideTabBar ? '' : 'pb-16'}>
        {tab === 'intranet' && <IntranetTab />}
        {tab === 'listings' && <ListingsTab />}
        {tab === 'settings' && <SettingsTab />}

        {tab === 'contract' && contractScreen === 'step1' && (
          <Step1Form
            onNext={() => setContractScreen('step2')}
            onList={() => setContractScreen('list')}
          />
        )}
        {tab === 'contract' && contractScreen === 'step2' && (
          <Step2Sign
            onNext={() => setContractScreen('step3')}
            onBack={() => setContractScreen('step1')}
          />
        )}
        {tab === 'contract' && contractScreen === 'step3' && (
          <Step3Done onNew={() => setContractScreen('step1')} />
        )}
        {tab === 'contract' && contractScreen === 'list' && (
          <ContractList onBack={() => setContractScreen('step1')} />
        )}
      </div>
    </ContractProvider>
  );
}

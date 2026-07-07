import { useState } from 'react';
import { ContractProvider } from './context/ContractContext';
import SplashScreen from './screens/SplashScreen';
import PinLock from './screens/PinLock';
import Step1Form from './screens/Step1Form';
import Step2Sign from './screens/Step2Sign';
import Step3Done from './screens/Step3Done';
import ContractList from './screens/ContractList';

export default function App() {
  const [splash, setSplash] = useState(true);
  const [auth, setAuth] = useState(false);
  const [screen, setScreen] = useState('step1'); // step1 | step2 | step3 | list

  if (splash) {
    return <SplashScreen onDone={() => setSplash(false)} />;
  }

  if (!auth) {
    return <PinLock onUnlock={() => setAuth(true)} />;
  }

  return (
    <ContractProvider>
      {/* 하단 탭 (step1, list) */}
      {(screen === 'step1' || screen === 'list') && (
        <nav className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 z-50 flex safe-area-bottom">
          <button
            type="button"
            onClick={() => setScreen('step1')}
            className={`flex-1 py-4 text-base font-semibold transition ${
              screen === 'step1' ? 'text-blue-400' : 'text-gray-500'
            }`}
          >
            계약서 작성
          </button>
          <button
            type="button"
            onClick={() => setScreen('list')}
            className={`flex-1 py-4 text-base font-semibold transition ${
              screen === 'list' ? 'text-blue-400' : 'text-gray-500'
            }`}
          >
            목록
          </button>
        </nav>
      )}

      <div className={screen === 'step1' || screen === 'list' ? 'pb-16' : ''}>
        {screen === 'step1' && (
          <Step1Form onNext={() => setScreen('step2')} />
        )}
        {screen === 'step2' && (
          <Step2Sign
            onNext={() => setScreen('step3')}
            onBack={() => setScreen('step1')}
          />
        )}
        {screen === 'step3' && (
          <Step3Done
            onNew={() => setScreen('step1')}
          />
        )}
        {screen === 'list' && (
          <ContractList onBack={() => setScreen('step1')} />
        )}
      </div>
    </ContractProvider>
  );
}

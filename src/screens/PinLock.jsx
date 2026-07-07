import { useState } from 'react';

const STORAGE_KEY = 'contract_pin';

export default function PinLock({ onUnlock }) {
  const storedPin = localStorage.getItem(STORAGE_KEY);
  const isFirstRun = !storedPin;

  const [mode, setMode] = useState(isFirstRun ? 'set' : 'enter'); // 'set' | 'confirm' | 'enter'
  const [pin, setPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [error, setError] = useState('');

  function handleKey(digit) {
    if (digit === 'del') {
      setPin(p => p.slice(0, -1));
      setError('');
      return;
    }
    const next = pin + digit;
    if (next.length > 4) return;
    setPin(next);

    if (next.length === 4) {
      setTimeout(() => processPin(next), 80);
    }
  }

  function processPin(entered) {
    if (mode === 'set') {
      setNewPin(entered);
      setPin('');
      setMode('confirm');
    } else if (mode === 'confirm') {
      if (entered === newPin) {
        localStorage.setItem(STORAGE_KEY, entered);
        onUnlock();
      } else {
        setPin('');
        setNewPin('');
        setMode('set');
        setError('PIN이 일치하지 않습니다. 다시 설정하세요.');
      }
    } else {
      if (entered === storedPin) {
        onUnlock();
      } else {
        setPin('');
        setError('PIN이 틀렸습니다.');
      }
    }
  }

  const label = mode === 'set'
    ? 'PIN 4자리를 설정하세요'
    : mode === 'confirm'
    ? 'PIN을 한 번 더 입력하세요'
    : 'PIN을 입력하세요';

  return (
    <div className="flex flex-col items-center justify-center min-h-svh bg-gray-50 gap-8 px-6">
      <div className="text-center">
        <p className="text-lg font-medium text-gray-700 mb-1">{label}</p>
        <div className="flex gap-4 justify-center mt-4">
          {[0, 1, 2, 3].map(i => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full border-2 transition-colors ${
                i < pin.length ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300'
              }`}
            />
          ))}
        </div>
        {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
      </div>

      <div className="grid grid-cols-3 gap-4 w-72">
        {['1','2','3','4','5','6','7','8','9','','0','del'].map((k, idx) => (
          k === '' ? (
            <div key={idx} />
          ) : (
            <button
              key={idx}
              type="button"
              onClick={() => handleKey(k)}
              className={`h-16 rounded-2xl text-xl font-medium shadow-sm transition active:scale-95 ${
                k === 'del'
                  ? 'bg-gray-200 text-gray-600'
                  : 'bg-white text-gray-800'
              }`}
            >
              {k === 'del' ? '⌫' : k}
            </button>
          )
        ))}
      </div>
    </div>
  );
}

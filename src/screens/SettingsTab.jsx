export default function SettingsTab() {
  function handleResetPin() {
    if (window.confirm('PIN을 초기화할까요? 앱을 다시 열 때 새 PIN을 설정합니다.')) {
      localStorage.removeItem('contract_pin');
      window.location.reload();
    }
  }

  return (
    <div className="flex flex-col min-h-svh bg-gray-950">
      <header className="bg-gray-900 border-b border-gray-800 px-4 py-4 sticky top-0 z-10">
        <h1 className="text-lg font-bold text-gray-100">설정</h1>
      </header>
      <div className="flex-1 px-4 py-5 space-y-4 pb-24">
        <div className="bg-gray-900 rounded-2xl divide-y divide-gray-800">
          <button
            type="button"
            onClick={handleResetPin}
            className="w-full px-4 py-4 text-left text-gray-200 active:bg-gray-800"
          >
            PIN 재설정
          </button>
        </div>
        <p className="text-xs text-gray-600 text-center">점포라인 전용 업무 앱</p>
      </div>
    </div>
  );
}

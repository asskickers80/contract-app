const INTRANET_URL = 'https://success.jumpoline.com/';

export default function IntranetTab() {
  function handleOpen() {
    window.open(INTRANET_URL, '_blank');
  }

  return (
    <div className="flex flex-col min-h-svh bg-gray-950">
      <header className="bg-gray-900 border-b border-gray-800 px-4 py-4 sticky top-0 z-10">
        <h1 className="text-lg font-bold text-gray-100">인트라넷</h1>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6 pb-24">
        <div className="text-center space-y-2">
          <p className="text-gray-200 text-lg font-medium">점포라인 인트라넷</p>
          <p className="text-sm text-gray-500">
            보안 정책상 앱 내부에 표시할 수 없어
            <br />
            새 탭(Safari)으로 열립니다.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpen}
          className="w-full max-w-xs py-4 rounded-2xl text-base font-semibold bg-blue-600 text-white active:bg-blue-700 transition"
        >
          인트라넷 열기
        </button>

        <div className="bg-gray-900 rounded-2xl px-4 py-4 max-w-xs">
          <p className="text-xs text-gray-400 leading-relaxed">
            <span className="text-gray-300 font-medium">함께 보기 팁</span>
            <br />
            인트라넷 탭을 화면 상단 가장자리로 끌어 Split View로 놓으면
            이 앱과 인트라넷을 나란히 사용할 수 있습니다.
          </p>
        </div>
      </div>
    </div>
  );
}

const INTRANET_URL = 'https://success.jumpoline.com/';

export default function IntranetTab() {
  return (
    <div className="flex flex-col min-h-svh bg-gray-950">
      <header className="bg-gray-900 border-b border-gray-800 px-4 py-4 sticky top-0 z-10">
        <h1 className="text-lg font-bold text-gray-100">인트라넷</h1>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6 pb-24">
        <div className="text-center space-y-2">
          <p className="text-gray-200 text-lg font-medium">점포라인 인트라넷</p>
          <p className="text-sm text-gray-500">
            앱 안 화면으로 열립니다.
            <br />
            왼쪽 위 <span className="text-gray-300">완료</span>를 누르면 돌아옵니다.
          </p>
        </div>

        <a
          href={INTRANET_URL}
          className="block w-full max-w-xs py-4 rounded-2xl text-base font-semibold bg-blue-600 text-white active:bg-blue-700 transition text-center"
        >
          인트라넷 열기
        </a>

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

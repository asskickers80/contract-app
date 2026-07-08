export default function IntranetTab() {
  return (
    <div className="flex flex-col min-h-svh bg-gray-950">
      <header className="bg-gray-900 border-b border-gray-800 px-4 py-4 sticky top-0 z-10">
        <h1 className="text-lg font-bold text-gray-100">인트라넷</h1>
      </header>
      <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 pb-24">
        <p className="text-gray-400 text-center">
          인트라넷 연결 준비 중입니다.
          <br />
          <span className="text-sm text-gray-500">iframe 임베드 테스트 후 연결됩니다.</span>
        </p>
      </div>
    </div>
  );
}

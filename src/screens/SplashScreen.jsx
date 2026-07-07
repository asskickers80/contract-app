import { useEffect } from 'react';

const CSS = `
  :root { --spd: 1; }
  .splash-body {
    margin: 0;
    background: #FFFFFF;
    font-family: 'Pretendard Variable', Pretendard, -apple-system, 'Noto Sans KR', sans-serif;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100svh;
  }
  .splash-stack { display: flex; flex-direction: column; align-items: center; padding-bottom: 6vh; }
  .splash-logo-slot { position: relative; width: 250px; height: 96px; }
  .splash-orbit {
    position: absolute; left: 50%; top: 50%; width: 0; height: 0;
    animation: splash-orbit calc(var(--spd) * 1.55s) cubic-bezier(.55, .06, .5, .94) forwards;
  }
  .splash-dot { position: absolute; left: -8px; top: -8px; width: 16px; height: 16px; border-radius: 50%; }
  .splash-dot-1 { background: #A6CE39; transform: rotate(0deg) translateX(54px); }
  .splash-dot-2 { background: #6CB33F; transform: rotate(120deg) translateX(54px); }
  .splash-dot-3 { background: #4E9A2E; transform: rotate(240deg) translateX(54px); }
  .splash-burst {
    position: absolute; left: 50%; top: 50%; width: 136px; height: 136px; margin: -68px 0 0 -68px;
    border-radius: 50%;
    background: radial-gradient(closest-side, rgba(140, 198, 62, .5), rgba(140, 198, 62, 0));
    opacity: 0;
    animation: splash-burst calc(var(--spd) * .55s) ease-out calc(var(--spd) * 1.5s) forwards;
  }
  .splash-logo {
    width: 250px; height: 96px; opacity: 0;
    animation: splash-pop calc(var(--spd) * .5s) ease-out calc(var(--spd) * 1.62s) forwards;
  }
  .splash-app-name {
    margin-top: 52px;
    font-size: 42px; font-weight: 700; color: #3E4637; letter-spacing: .05em;
    opacity: 0;
    animation: splash-fade-up calc(var(--spd) * .5s) ease-out calc(var(--spd) * 2.2s) forwards;
  }
  .splash-doc-name {
    margin-top: 16px;
    font-size: 25px; font-weight: 500; color: #8A9480; letter-spacing: .16em; padding-left: .16em;
    opacity: 0;
    animation: splash-fade-up calc(var(--spd) * .5s) ease-out calc(var(--spd) * 2.45s) forwards;
  }
  @keyframes splash-orbit { from { transform: rotate(0deg) scale(1); } to { transform: rotate(720deg) scale(0); } }
  @keyframes splash-burst { 0% { opacity: .85; transform: scale(.15); } 100% { opacity: 0; transform: scale(1.6); } }
  @keyframes splash-pop { 0% { opacity: 0; transform: scale(.92); } 100% { opacity: 1; transform: scale(1); } }
  @keyframes splash-fade-up { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: none; } }
  @media (prefers-reduced-motion: reduce) {
    .splash-orbit, .splash-burst { display: none; }
    .splash-logo, .splash-app-name, .splash-doc-name { animation: none; opacity: 1; }
  }
`;

export default function SplashScreen({ onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3200);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <>
      <style>{CSS}</style>
      <div className="splash-body">
        <div className="splash-stack">
          <div className="splash-logo-slot">
            <div className="splash-orbit">
              <div className="splash-dot splash-dot-1" />
              <div className="splash-dot splash-dot-2" />
              <div className="splash-dot splash-dot-3" />
            </div>
            <div className="splash-burst" />
            <img className="splash-logo" src="/jeompoline-logo.png" alt="점포라인" />
          </div>
          <div className="splash-app-name">점포라인 전자계약</div>
          <div className="splash-doc-name">매물광고 이용계약서</div>
        </div>
      </div>
    </>
  );
}

import { useState, useEffect, useRef } from 'react';
import { useContract } from '../context/ContractContext';
import { CATEGORIES, PRODUCTS } from '../constants/categories';
import { formatBizNumber, formatCurrency, parseCurrency } from '../lib/utils';

const RECENT_KEY = 'recent_biz_types';

function getRecent() {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); }
  catch { return []; }
}
function saveRecent(type) {
  const prev = getRecent().filter(t => t !== type);
  localStorage.setItem(RECENT_KEY, JSON.stringify([type, ...prev].slice(0, 3)));
}

export default function Step1Form({ onNext }) {
  const { data, update } = useContract();
  const [catTab, setCatTab] = useState(0);
  const [showCatPicker, setShowCatPicker] = useState(false);
  const [customType, setCustomType] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [recent, setRecent] = useState(getRecent);
  const [showAddrSearch, setShowAddrSearch] = useState(false);
  const [baseAddress, setBaseAddress] = useState('');
  const [addrDetail, setAddrDetail] = useState('');
  const addrRef = useRef(null);

  useEffect(() => {
    if (!showAddrSearch || !addrRef.current) return;
    new window.daum.Postcode({
      oncomplete: (result) => {
        setBaseAddress(result.address);
        setAddrDetail('');
        update({ address: result.address });
        setShowAddrSearch(false);
      },
      width: '100%',
      height: '100%',
    }).embed(addrRef.current);
  }, [showAddrSearch]);

  function handleAddrDetail(val) {
    setAddrDetail(val);
    update({ address: baseAddress + (val ? ' ' + val : '') });
  }

  const handleBizType = (type) => {
    update({ businessType: type });
    saveRecent(type);
    setRecent(getRecent());
    setShowCatPicker(false);
    setShowCustomInput(false);
  };

  const handleProduct = (p) => {
    update({ productName: p.name, adFee: p.fee, vat: p.vat, totalFee: p.total });
  };

  const handleFeeChange = (field, raw) => {
    const num = parseCurrency(raw);
    if (field === 'adFee') {
      const newVat = Math.round(num * 0.1);
      update({ adFee: num, vat: newVat, totalFee: num + newVat });
    } else if (field === 'vat') {
      update({ vat: num, totalFee: (data.adFee || 0) + num });
    } else {
      update({ [field]: num });
    }
  };

  const valid = data.storeName.trim() && data.businessType.trim() && data.address.trim();

  return (
    <>
    {showAddrSearch && (
      <div className="fixed inset-0 z-50 bg-white flex flex-col">
        <div className="flex items-center gap-3 px-4 py-3 border-b bg-white">
          <button type="button" onClick={() => setShowAddrSearch(false)}
            className="text-gray-500 text-sm">← 닫기</button>
          <span className="font-semibold text-gray-800">주소 검색</span>
        </div>
        <div ref={addrRef} className="flex-1" />
      </div>
    )}
    <div className="flex flex-col min-h-svh bg-gray-950">
      <header className="bg-gray-900 border-b border-gray-800 px-4 py-4 flex items-center justify-between sticky top-0 z-10">
        <h1 className="text-lg font-bold text-gray-100">새 계약서 작성</h1>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5 pb-44">

        {/* 상품 선택 */}
        <section>
          <label className="text-sm font-semibold text-gray-500 mb-2 block">광고 상품</label>
          <div className="grid grid-cols-3 gap-2">
            {PRODUCTS.map(p => {
              const selected = data.adFee === p.fee && data.totalFee === p.total;
              return (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => handleProduct(p)}
                  className={`py-3 rounded-xl text-sm font-medium border-2 transition ${
                    selected
                      ? 'border-blue-500 bg-blue-950 text-blue-300'
                      : 'border-gray-700 bg-gray-900 text-gray-300'
                  }`}
                >
                  <div>{p.name}</div>
                  <div className="text-xs mt-0.5 opacity-70">{formatCurrency(p.total)}원</div>
                </button>
              );
            })}
          </div>
        </section>

        {/* 건별 입력 */}
        <section className="bg-gray-900 rounded-2xl p-4 space-y-4">
          <p className="text-sm font-semibold text-gray-500">매물 정보</p>

          <div>
            <label className="text-xs text-gray-400 mb-1 block">상호 *</label>
            <input
              type="text"
              value={data.storeName}
              onChange={e => update({ storeName: e.target.value })}
              placeholder="상호명 입력"
              className="w-full border border-gray-700 bg-gray-800 text-gray-100 rounded-xl px-3 py-3 text-base outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 mb-1 block">업종 *</label>
            {data.businessType ? (
              <div className="flex items-center gap-2">
                <div className="flex-1 border border-gray-700 rounded-xl px-3 py-3 bg-gray-800 text-base text-gray-100">
                  {data.businessType}
                </div>
                <button
                  type="button"
                  onClick={() => { update({ businessType: '' }); setShowCatPicker(false); }}
                  className="text-sm text-gray-400 px-2"
                >
                  변경
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowCatPicker(v => !v)}
                className="w-full border border-gray-700 bg-gray-800 rounded-xl px-3 py-3 text-left text-gray-500 text-base"
              >
                업종 선택
              </button>
            )}

            {showCatPicker && !data.businessType && (
              <div className="mt-2 border border-gray-700 rounded-2xl bg-gray-900 overflow-hidden">
                {/* 최근 선택 */}
                {recent.length > 0 && (
                  <div className="px-3 py-2 border-b border-gray-800">
                    <p className="text-xs text-gray-400 mb-1.5">최근 선택</p>
                    <div className="flex flex-wrap gap-2">
                      {recent.map(t => (
                        <button key={t} type="button" onClick={() => handleBizType(t)}
                          className="px-3 py-1.5 bg-blue-950 text-blue-300 rounded-lg text-sm">
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {/* 대분류 탭 */}
                <div className="overflow-x-auto flex border-b border-gray-800">
                  {CATEGORIES.map((cat, i) => (
                    <button key={cat.label} type="button"
                      onClick={() => setCatTab(i)}
                      className={`flex-shrink-0 px-3 py-2 text-sm border-b-2 transition ${
                        catTab === i ? 'border-blue-500 text-blue-400 font-medium' : 'border-transparent text-gray-500'
                      }`}>
                      {cat.label}
                    </button>
                  ))}
                </div>
                {/* 소분류 */}
                <div className="p-3 flex flex-wrap gap-2">
                  {CATEGORIES[catTab].items.map(item => (
                    <button key={item} type="button" onClick={() => handleBizType(item)}
                      className="px-3 py-1.5 border border-gray-700 rounded-lg text-sm text-gray-300 bg-gray-800 active:bg-gray-700">
                      {item}
                    </button>
                  ))}
                  <button type="button" onClick={() => setShowCustomInput(v => !v)}
                    className="px-3 py-1.5 border-dashed border-2 border-gray-600 rounded-lg text-sm text-gray-500">
                    직접입력
                  </button>
                </div>
                {showCustomInput && (
                  <div className="px-3 pb-3 flex gap-2">
                    <input
                      type="text"
                      value={customType}
                      onChange={e => setCustomType(e.target.value)}
                      placeholder="업종명 직접 입력"
                      className="flex-1 border border-gray-700 bg-gray-800 text-gray-100 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
                    />
                    <button type="button"
                      onClick={() => { if (customType.trim()) handleBizType(customType.trim()); }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">
                      확인
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="text-xs text-gray-400 mb-1 block">사업자등록번호</label>
            <input
              type="text"
              inputMode="numeric"
              value={data.bizNumber}
              onChange={e => update({ bizNumber: formatBizNumber(e.target.value) })}
              placeholder="000-00-00000"
              className="w-full border border-gray-700 bg-gray-800 text-gray-100 rounded-xl px-3 py-3 text-base outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 mb-1 block">소재지 *</label>
            {baseAddress ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1 border border-gray-700 rounded-xl px-3 py-3 bg-gray-800 text-base text-gray-100">
                    {baseAddress}
                  </div>
                  <button type="button" onClick={() => { setBaseAddress(''); setAddrDetail(''); update({ address: '' }); }}
                    className="text-sm text-gray-400 px-2">변경</button>
                </div>
                <input
                  type="text"
                  value={addrDetail}
                  onChange={e => handleAddrDetail(e.target.value)}
                  placeholder="상세주소 입력 (동·호수 등)"
                  className="w-full border border-gray-700 bg-gray-800 text-gray-100 rounded-xl px-3 py-3 text-base outline-none focus:border-blue-500"
                />
              </div>
            ) : (
              <button type="button" onClick={() => setShowAddrSearch(true)}
                className="w-full border border-gray-700 bg-gray-800 rounded-xl px-3 py-3 text-left text-gray-500 text-base">
                주소 검색
              </button>
            )}
          </div>
        </section>

        {/* 기본값 (수정 가능) */}
        <section className="bg-gray-900 rounded-2xl p-4 space-y-4">
          <p className="text-sm font-semibold text-gray-500">광고 조건</p>

          <div>
            <label className="text-xs text-gray-400 mb-1 block">광고개시일</label>
            <input
              type="date"
              value={data.startDate}
              onChange={e => update({ startDate: e.target.value })}
              className="w-full border border-gray-700 bg-gray-800 text-gray-100 rounded-xl px-3 py-3 text-base outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">광고료</label>
              <input
                type="text"
                inputMode="numeric"
                value={data.adFee ? formatCurrency(data.adFee) : ''}
                onChange={e => handleFeeChange('adFee', e.target.value)}
                placeholder="0"
                className="w-full border border-gray-700 bg-gray-800 text-gray-100 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-500 text-right"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">부가세</label>
              <input
                type="text"
                inputMode="numeric"
                value={data.vat ? formatCurrency(data.vat) : ''}
                onChange={e => handleFeeChange('vat', e.target.value)}
                placeholder="0"
                className="w-full border border-gray-700 bg-gray-800 text-gray-100 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-500 text-right"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">총액</label>
              <input
                type="text"
                inputMode="numeric"
                value={data.totalFee ? formatCurrency(data.totalFee) : ''}
                onChange={e => update({ totalFee: parseCurrency(e.target.value) })}
                placeholder="0"
                className="w-full border border-gray-700 bg-gray-800 text-gray-100 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-500 text-right"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-400 bg-gray-800 rounded-xl px-3 py-3">
            <span>광고기간</span>
            <span className="font-medium text-gray-200 ml-auto">3개월</span>
            <span>·</span>
            <span>종료일 {data.endDate}</span>
          </div>
        </section>
      </div>

      <div className="fixed bottom-16 left-0 right-0 bg-gray-900 border-t border-gray-800 px-4 py-4">
        <button
          type="button"
          onClick={onNext}
          disabled={!valid}
          className={`w-full py-4 rounded-2xl text-base font-semibold transition ${
            valid ? 'bg-blue-600 text-white active:bg-blue-700' : 'bg-gray-700 text-gray-500'
          }`}
        >
          다음 — 고객 서명
        </button>
      </div>
    </div>
    </>
  );
}

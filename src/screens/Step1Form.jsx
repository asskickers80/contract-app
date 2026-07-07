import { useState, useEffect } from 'react';
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
    <div className="flex flex-col min-h-svh bg-gray-50">
      <header className="bg-white border-b px-4 py-4 flex items-center justify-between sticky top-0 z-10">
        <h1 className="text-lg font-bold text-gray-800">새 계약서 작성</h1>
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
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white text-gray-700'
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
        <section className="bg-white rounded-2xl p-4 space-y-4">
          <p className="text-sm font-semibold text-gray-500">매물 정보</p>

          <div>
            <label className="text-xs text-gray-400 mb-1 block">상호 *</label>
            <input
              type="text"
              value={data.storeName}
              onChange={e => update({ storeName: e.target.value })}
              placeholder="상호명 입력"
              className="w-full border rounded-xl px-3 py-3 text-base outline-none focus:border-blue-400"
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 mb-1 block">업종 *</label>
            {data.businessType ? (
              <div className="flex items-center gap-2">
                <div className="flex-1 border rounded-xl px-3 py-3 bg-gray-50 text-base text-gray-800">
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
                className="w-full border rounded-xl px-3 py-3 text-left text-gray-400 text-base"
              >
                업종 선택
              </button>
            )}

            {showCatPicker && !data.businessType && (
              <div className="mt-2 border rounded-2xl bg-white overflow-hidden">
                {/* 최근 선택 */}
                {recent.length > 0 && (
                  <div className="px-3 py-2 border-b">
                    <p className="text-xs text-gray-400 mb-1.5">최근 선택</p>
                    <div className="flex flex-wrap gap-2">
                      {recent.map(t => (
                        <button key={t} type="button" onClick={() => handleBizType(t)}
                          className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm">
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {/* 대분류 탭 */}
                <div className="overflow-x-auto flex border-b">
                  {CATEGORIES.map((cat, i) => (
                    <button key={cat.label} type="button"
                      onClick={() => setCatTab(i)}
                      className={`flex-shrink-0 px-3 py-2 text-sm border-b-2 transition ${
                        catTab === i ? 'border-blue-600 text-blue-700 font-medium' : 'border-transparent text-gray-500'
                      }`}>
                      {cat.label}
                    </button>
                  ))}
                </div>
                {/* 소분류 */}
                <div className="p-3 flex flex-wrap gap-2">
                  {CATEGORIES[catTab].items.map(item => (
                    <button key={item} type="button" onClick={() => handleBizType(item)}
                      className="px-3 py-1.5 border rounded-lg text-sm text-gray-700 bg-gray-50 active:bg-gray-200">
                      {item}
                    </button>
                  ))}
                  <button type="button" onClick={() => setShowCustomInput(v => !v)}
                    className="px-3 py-1.5 border-dashed border-2 rounded-lg text-sm text-gray-400">
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
                      className="flex-1 border rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
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
              className="w-full border rounded-xl px-3 py-3 text-base outline-none focus:border-blue-400"
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 mb-1 block">소재지 *</label>
            <input
              type="text"
              value={data.address}
              onChange={e => update({ address: e.target.value })}
              placeholder="주소 입력"
              className="w-full border rounded-xl px-3 py-3 text-base outline-none focus:border-blue-400"
            />
          </div>
        </section>

        {/* 기본값 (수정 가능) */}
        <section className="bg-white rounded-2xl p-4 space-y-4">
          <p className="text-sm font-semibold text-gray-500">광고 조건</p>

          <div>
            <label className="text-xs text-gray-400 mb-1 block">담당 에이전트</label>
            <input
              type="text"
              value={data.agentName}
              onChange={e => {
                update({ agentName: e.target.value });
                localStorage.setItem('agentName', e.target.value);
              }}
              placeholder="에이전트 이름"
              className="w-full border rounded-xl px-3 py-3 text-base outline-none focus:border-blue-400"
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 mb-1 block">광고개시일</label>
            <input
              type="date"
              value={data.startDate}
              onChange={e => update({ startDate: e.target.value })}
              className="w-full border rounded-xl px-3 py-3 text-base outline-none focus:border-blue-400"
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
                className="w-full border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400 text-right"
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
                className="w-full border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400 text-right"
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
                className="w-full border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400 text-right"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 rounded-xl px-3 py-3">
            <span>광고기간</span>
            <span className="font-medium text-gray-800 ml-auto">3개월</span>
            <span>·</span>
            <span>종료일 {data.endDate}</span>
          </div>
        </section>
      </div>

      <div className="fixed bottom-16 left-0 right-0 bg-white border-t px-4 py-4">
        <button
          type="button"
          onClick={onNext}
          disabled={!valid}
          className={`w-full py-4 rounded-2xl text-base font-semibold transition ${
            valid ? 'bg-blue-600 text-white active:bg-blue-700' : 'bg-gray-200 text-gray-400'
          }`}
        >
          다음 — 고객 서명
        </button>
      </div>
    </div>
  );
}

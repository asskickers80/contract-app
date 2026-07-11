import { useState, useEffect, useRef } from 'react';
import BizTypePicker from '../components/BizTypePicker';
import {
  findCustomerByPhone, findLatestListing, fetchListings, saveCard,
  fetchAttachments, uploadAttachments, deleteAttachment,
} from '../lib/listingsApi';
import { formatPhone, formatBizNumber, formatCurrency, parseCurrency, toShortDate } from '../lib/utils';

const CUSTOMER_TYPES = ['양도자', '임차인', '기타'];

const EMPTY_LISTING = {
  store_name: '',
  business_type: '',
  biz_number: '',
  address: '',
  deposit: 0,
  monthly_rent: 0,
  premium: 0,
  maintenance_fee: 0,
};

export default function ListingsTab() {
  const [view, setView] = useState('home'); // home | list | card
  const [listings, setListings] = useState([]);
  const [query, setQuery] = useState('');
  const [loadingList, setLoadingList] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // 카드 편집 상태
  const [customer, setCustomer] = useState({ phone: '', name: '', type: '' });
  const [listing, setListing] = useState(EMPTY_LISTING);
  const [listingId, setListingId] = useState(null);
  const [attachments, setAttachments] = useState([]);   // 저장된 사진
  const [pendingFiles, setPendingFiles] = useState([]); // 저장 전 새 사진
  const [saving, setSaving] = useState(false);

  async function openList() {
    setView('list');
    setLoadingList(true);
    setErrorMsg('');
    try {
      setListings(await fetchListings());
    } catch (e) {
      setErrorMsg(e?.message || String(e));
    } finally {
      setLoadingList(false);
    }
  }

  function openNewCard() {
    setCustomer({ phone: '', name: '', type: '' });
    setListing(EMPTY_LISTING);
    setListingId(null);
    setAttachments([]);
    setPendingFiles([]);
    setErrorMsg('');
    setView('card');
  }

  async function openCard(item) {
    const c = item.customers;
    setCustomer({ phone: c?.phone || '', name: c?.name || '', type: c?.type || '' });
    setListing({ ...EMPTY_LISTING, ...item });
    setListingId(item.id);
    setPendingFiles([]);
    setErrorMsg('');
    setView('card');
    try {
      setAttachments(await fetchAttachments(item.id));
    } catch {
      setAttachments([]);
    }
  }

  async function handleSave() {
    setSaving(true);
    setErrorMsg('');
    try {
      // 신규인 경우: 같은 번호의 기존 고객·카드가 있으면 그 카드에 이어붙임
      let targetListingId = listingId;
      if (!targetListingId) {
        const existing = await findCustomerByPhone(customer.phone);
        if (existing) {
          const latest = await findLatestListing(existing.id);
          if (latest) targetListingId = latest.id;
        }
      }

      const { listing: saved } = await saveCard({
        customer,
        listing: {
          store_name: listing.store_name,
          business_type: listing.business_type,
          biz_number: listing.biz_number,
          address: listing.address,
          deposit: listing.deposit || 0,
          monthly_rent: listing.monthly_rent || 0,
          premium: listing.premium || 0,
          maintenance_fee: listing.maintenance_fee || 0,
        },
        listingId: targetListingId,
      });

      if (pendingFiles.length > 0) {
        await uploadAttachments(saved.id, pendingFiles.map(p => p.file));
      }
      pendingFiles.forEach(p => URL.revokeObjectURL(p.url));
      setView('home');
    } catch (e) {
      setErrorMsg(e?.message || String(e));
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteAttachment(att) {
    try {
      await deleteAttachment(att);
      setAttachments(prev => prev.filter(a => a.id !== att.id));
    } catch (e) {
      setErrorMsg(e?.message || String(e));
    }
  }

  const queryDigits = query.replace(/\D/g, '');
  const filtered = listings.filter(l =>
    (query && l.store_name?.includes(query)) ||
    (queryDigits && l.customers?.phone?.replace(/\D/g, '').includes(queryDigits)) ||
    !query
  );

  // ── 카드 화면 ──
  if (view === 'card') {
    return (
      <CardForm
        customer={customer}
        setCustomer={setCustomer}
        listing={listing}
        setListing={setListing}
        isNew={!listingId}
        attachments={attachments}
        pendingFiles={pendingFiles}
        setPendingFiles={setPendingFiles}
        onDeleteAttachment={handleDeleteAttachment}
        saving={saving}
        errorMsg={errorMsg}
        onSave={handleSave}
        onBack={() => { setView('home'); setErrorMsg(''); }}
      />
    );
  }

  // ── 불러오기 (목록) 화면 ──
  if (view === 'list') {
    return (
      <div className="flex flex-col min-h-svh bg-gray-950">
        <header className="bg-gray-900 border-b border-gray-800 px-4 py-4 sticky top-0 z-10 space-y-3">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setView('home')} className="text-gray-400 text-sm">← 뒤로</button>
            <h1 className="text-lg font-bold text-gray-100">매물카드 불러오기</h1>
          </div>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="상호명 또는 전화번호 검색"
            className="w-full border border-gray-700 bg-gray-800 text-gray-100 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-500"
          />
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-4 pb-24">
          {errorMsg && (
            <div className="text-xs text-red-300 bg-red-950 rounded-xl px-3 py-2 mb-3 break-all">{errorMsg}</div>
          )}
          <div className="bg-gray-900 rounded-2xl divide-y divide-gray-800 overflow-hidden">
            {loadingList && <p className="text-center text-gray-500 py-10 text-sm">불러오는 중...</p>}
            {!loadingList && filtered.length === 0 && (
              <p className="text-center text-gray-500 py-10 text-sm">매물카드가 없습니다.</p>
            )}
            {filtered.map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => openCard(item)}
                className="w-full px-4 py-4 text-left active:bg-gray-800 transition"
              >
                <div className="flex items-center justify-between">
                  <p className="font-medium text-gray-100 truncate">
                    {item.store_name || '(상호 미입력)'}
                  </p>
                  <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                    {item.updated_at ? toShortDate(item.updated_at.split('T')[0]) : ''}
                  </span>
                </div>
                <p className="text-sm text-gray-400 mt-0.5">
                  {item.customers?.name || '이름 없음'} · {item.customers?.phone}
                  {item.customers?.type ? ` · ${item.customers.type}` : ''}
                </p>
                {item.business_type && (
                  <p className="text-xs text-gray-500 mt-0.5">{item.business_type}</p>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── 홈 (신규 / 불러오기) ──
  return (
    <div className="flex flex-col min-h-svh bg-gray-950">
      <header className="bg-gray-900 border-b border-gray-800 px-4 py-4 sticky top-0 z-10">
        <h1 className="text-lg font-bold text-gray-100">매물카드</h1>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 pb-24">
        <button
          type="button"
          onClick={openNewCard}
          className="w-full max-w-sm py-8 rounded-3xl bg-blue-600 text-white active:bg-blue-700 transition"
        >
          <span className="block text-xl font-bold">신규</span>
          <span className="block text-sm mt-1 opacity-80">새 카드 작성 · 캡쳐 사진 불러오기</span>
        </button>

        <button
          type="button"
          onClick={openList}
          className="w-full max-w-sm py-8 rounded-3xl bg-gray-900 border border-gray-700 text-gray-100 active:bg-gray-800 transition"
        >
          <span className="block text-xl font-bold">불러오기</span>
          <span className="block text-sm mt-1 text-gray-400">저장된 매물카드 열기 · 검색</span>
        </button>
      </div>
    </div>
  );
}

function CardForm({
  customer, setCustomer, listing, setListing, isNew,
  attachments, pendingFiles, setPendingFiles, onDeleteAttachment,
  saving, errorMsg, onSave, onBack,
}) {
  const [showAddrSearch, setShowAddrSearch] = useState(false);
  const [baseAddress, setBaseAddress] = useState(listing.address || '');
  const [addrDetail, setAddrDetail] = useState('');
  const [viewerUrl, setViewerUrl] = useState('');
  const addrRef = useRef(null);
  const fileRef = useRef(null);

  useEffect(() => {
    if (!showAddrSearch || !addrRef.current) return;
    new window.daum.Postcode({
      oncomplete: (result) => {
        setBaseAddress(result.address);
        setAddrDetail('');
        setListing(l => ({ ...l, address: result.address }));
        setShowAddrSearch(false);
      },
      width: '100%',
      height: '100%',
    }).embed(addrRef.current);
  }, [showAddrSearch, setListing]);

  function handleAddrDetail(val) {
    setAddrDetail(val);
    setListing(l => ({ ...l, address: baseAddress + (val ? ' ' + val : '') }));
  }

  function handleFiles(e) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const items = files.map(file => ({ file, url: URL.createObjectURL(file) }));
    setPendingFiles(prev => [...prev, ...items]);
    e.target.value = '';
  }

  function removePending(idx) {
    setPendingFiles(prev => {
      URL.revokeObjectURL(prev[idx].url);
      return prev.filter((_, i) => i !== idx);
    });
  }

  const phoneValid = customer.phone.replace(/\D/g, '').length >= 10;

  const moneyField = (label, key) => (
    <div>
      <label className="text-xs text-gray-400 mb-1 block">{label}</label>
      <input
        type="text"
        inputMode="numeric"
        value={listing[key] ? formatCurrency(listing[key]) : ''}
        onChange={e => setListing(l => ({ ...l, [key]: parseCurrency(e.target.value) }))}
        placeholder="0"
        className="w-full border border-gray-700 bg-gray-800 text-gray-100 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-500 text-right"
      />
    </div>
  );

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

      {viewerUrl && (
        <div
          className="fixed inset-0 z-50 bg-black flex items-center justify-center"
          onClick={() => setViewerUrl('')}
        >
          <img src={viewerUrl} alt="" className="max-w-full max-h-full object-contain" />
          <button
            type="button"
            onClick={() => setViewerUrl('')}
            className="absolute top-4 right-4 text-white text-sm bg-gray-800/80 rounded-full px-4 py-2"
          >
            닫기
          </button>
        </div>
      )}

      <div className="flex flex-col min-h-svh bg-gray-950">
        <header className="bg-gray-900 border-b border-gray-800 px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
          <button type="button" onClick={onBack} className="text-gray-400 text-sm">← 뒤로</button>
          <h1 className="text-lg font-bold text-gray-100">
            {isNew ? '새 매물카드' : '매물카드'}
          </h1>
          {!isNew && <span className="ml-auto text-sm text-gray-500">{customer.phone}</span>}
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5 pb-44">
          {/* 사진 (캡쳐 불러오기) */}
          <section className="bg-gray-900 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-500">사진</p>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="text-sm text-blue-400 font-medium px-2 py-1"
              >
                + 사진 불러오기
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFiles}
                className="hidden"
              />
            </div>

            {attachments.length === 0 && pendingFiles.length === 0 ? (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full border-2 border-dashed border-gray-700 rounded-xl py-8 text-gray-500 text-sm"
              >
                캡쳐·사진 파일을 여기에 추가하세요
              </button>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {pendingFiles.map((p, idx) => (
                  <div key={p.url} className="relative">
                    <img
                      src={p.url}
                      alt=""
                      onClick={() => setViewerUrl(p.url)}
                      className="w-full h-24 object-cover rounded-xl border border-blue-500/50"
                    />
                    <button
                      type="button"
                      onClick={() => removePending(idx)}
                      className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-gray-700 text-gray-200 rounded-full text-xs"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                {attachments.map(att => (
                  <div key={att.id} className="relative">
                    <img
                      src={att.url}
                      alt=""
                      onClick={() => setViewerUrl(att.url)}
                      className="w-full h-24 object-cover rounded-xl border border-gray-700"
                    />
                    <button
                      type="button"
                      onClick={() => onDeleteAttachment(att)}
                      className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-gray-700 text-gray-200 rounded-full text-xs"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
            {pendingFiles.length > 0 && (
              <p className="text-xs text-gray-500">새 사진 {pendingFiles.length}장 — 카드 저장 시 함께 저장됩니다.</p>
            )}
          </section>

          {/* 고객 정보 */}
          <section className="bg-gray-900 rounded-2xl p-4 space-y-4">
            <p className="text-sm font-semibold text-gray-500">고객 정보</p>
            {isNew && (
              <div>
                <label className="text-xs text-gray-400 mb-1 block">전화번호 *</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={customer.phone}
                  onChange={e => setCustomer(c => ({ ...c, phone: formatPhone(e.target.value) }))}
                  placeholder="010-0000-0000"
                  className="w-full border border-gray-700 bg-gray-800 text-gray-100 rounded-xl px-3 py-3 text-base tracking-wider outline-none focus:border-blue-500"
                />
              </div>
            )}
            <div>
              <label className="text-xs text-gray-400 mb-1 block">고객명</label>
              <input
                type="text"
                value={customer.name}
                onChange={e => setCustomer(c => ({ ...c, name: e.target.value }))}
                placeholder="이름 입력"
                className="w-full border border-gray-700 bg-gray-800 text-gray-100 rounded-xl px-3 py-3 text-base outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">구분</label>
              <div className="grid grid-cols-3 gap-2">
                {CUSTOMER_TYPES.map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setCustomer(c => ({ ...c, type: t }))}
                    className={`py-3 rounded-xl text-sm font-medium border-2 transition ${
                      customer.type === t
                        ? 'border-blue-500 bg-blue-950 text-blue-300'
                        : 'border-gray-700 bg-gray-900 text-gray-300'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* 매물 정보 */}
          <section className="bg-gray-900 rounded-2xl p-4 space-y-4">
            <p className="text-sm font-semibold text-gray-500">매물 정보</p>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">상호</label>
              <input
                type="text"
                value={listing.store_name}
                onChange={e => setListing(l => ({ ...l, store_name: e.target.value }))}
                placeholder="상호명 입력"
                className="w-full border border-gray-700 bg-gray-800 text-gray-100 rounded-xl px-3 py-3 text-base outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">업종</label>
              <BizTypePicker
                value={listing.business_type}
                onChange={v => setListing(l => ({ ...l, business_type: v }))}
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">사업자등록번호</label>
              <input
                type="text"
                inputMode="numeric"
                value={listing.biz_number}
                onChange={e => setListing(l => ({ ...l, biz_number: formatBizNumber(e.target.value) }))}
                placeholder="000-00-00000"
                className="w-full border border-gray-700 bg-gray-800 text-gray-100 rounded-xl px-3 py-3 text-base outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">소재지</label>
              {listing.address ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 border border-gray-700 rounded-xl px-3 py-3 bg-gray-800 text-base text-gray-100">
                      {baseAddress || listing.address}
                    </div>
                    <button
                      type="button"
                      onClick={() => { setBaseAddress(''); setAddrDetail(''); setListing(l => ({ ...l, address: '' })); }}
                      className="text-sm text-gray-400 px-2"
                    >
                      변경
                    </button>
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
                <button
                  type="button"
                  onClick={() => setShowAddrSearch(true)}
                  className="w-full border border-gray-700 bg-gray-800 rounded-xl px-3 py-3 text-left text-gray-500 text-base"
                >
                  주소 검색
                </button>
              )}
            </div>
          </section>

          {/* 거래 조건 */}
          <section className="bg-gray-900 rounded-2xl p-4 space-y-4">
            <p className="text-sm font-semibold text-gray-500">거래 조건 (원)</p>
            <div className="grid grid-cols-2 gap-3">
              {moneyField('보증금', 'deposit')}
              {moneyField('월세', 'monthly_rent')}
              {moneyField('권리금', 'premium')}
              {moneyField('관리비', 'maintenance_fee')}
            </div>
          </section>

          {errorMsg && (
            <div className="text-xs text-red-300 bg-red-950 rounded-xl px-3 py-2 break-all">{errorMsg}</div>
          )}
        </div>

        <div className="fixed bottom-16 left-0 right-0 bg-gray-900 border-t border-gray-800 px-4 py-4">
          <button
            type="button"
            onClick={onSave}
            disabled={saving || !phoneValid}
            className={`w-full py-4 rounded-2xl text-base font-semibold transition ${
              saving || !phoneValid ? 'bg-gray-700 text-gray-500' : 'bg-blue-600 text-white active:bg-blue-700'
            }`}
          >
            {saving ? '저장 중...' : phoneValid ? '카드 저장' : '전화번호를 입력하세요'}
          </button>
        </div>
      </div>
    </>
  );
}

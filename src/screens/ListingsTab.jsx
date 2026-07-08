import { useState, useEffect, useRef } from 'react';
import BizTypePicker from '../components/BizTypePicker';
import { findCustomerByPhone, findLatestListing, fetchListings, saveCard } from '../lib/listingsApi';
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
  const [view, setView] = useState('home'); // home | card
  const [phone, setPhone] = useState('');
  const [looking, setLooking] = useState(false);
  const [listings, setListings] = useState([]);
  const [query, setQuery] = useState('');
  const [loadingList, setLoadingList] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // 카드 편집 상태
  const [customer, setCustomer] = useState({ phone: '', name: '', type: '' });
  const [listing, setListing] = useState(EMPTY_LISTING);
  const [listingId, setListingId] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    refreshList();
  }, []);

  async function refreshList() {
    setLoadingList(true);
    try {
      setListings(await fetchListings());
    } catch (e) {
      setErrorMsg(e?.message || String(e));
    } finally {
      setLoadingList(false);
    }
  }

  async function handleLookup() {
    if (phone.replace(/\D/g, '').length < 10) return;
    setLooking(true);
    setErrorMsg('');
    try {
      const found = await findCustomerByPhone(phone);
      if (found) {
        const latest = await findLatestListing(found.id);
        setCustomer({ phone: found.phone, name: found.name || '', type: found.type || '' });
        setListing(latest ? { ...EMPTY_LISTING, ...latest } : EMPTY_LISTING);
        setListingId(latest?.id || null);
      } else {
        setCustomer({ phone, name: '', type: '' });
        setListing(EMPTY_LISTING);
        setListingId(null);
      }
      setView('card');
    } catch (e) {
      setErrorMsg(e?.message || String(e));
    } finally {
      setLooking(false);
    }
  }

  function openCard(item) {
    const c = item.customers;
    setCustomer({ phone: c?.phone || '', name: c?.name || '', type: c?.type || '' });
    setListing({ ...EMPTY_LISTING, ...item });
    setListingId(item.id);
    setView('card');
  }

  async function handleSave() {
    setSaving(true);
    setErrorMsg('');
    try {
      await saveCard({
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
        listingId,
      });
      setPhone('');
      setView('home');
      refreshList();
    } catch (e) {
      setErrorMsg(e?.message || String(e));
    } finally {
      setSaving(false);
    }
  }

  const queryDigits = query.replace(/\D/g, '');
  const filtered = listings.filter(l =>
    (query && l.store_name?.includes(query)) ||
    (queryDigits && l.customers?.phone?.replace(/\D/g, '').includes(queryDigits)) ||
    !query
  );

  if (view === 'card') {
    return (
      <CardForm
        customer={customer}
        setCustomer={setCustomer}
        listing={listing}
        setListing={setListing}
        isNew={!listingId}
        saving={saving}
        errorMsg={errorMsg}
        onSave={handleSave}
        onBack={() => { setView('home'); setErrorMsg(''); }}
      />
    );
  }

  return (
    <div className="flex flex-col min-h-svh bg-gray-950">
      <header className="bg-gray-900 border-b border-gray-800 px-4 py-4 sticky top-0 z-10">
        <h1 className="text-lg font-bold text-gray-100">매물카드</h1>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5 pb-24">
        {/* 전화번호 조회 */}
        <section className="bg-gray-900 rounded-2xl p-4 space-y-3">
          <p className="text-sm font-semibold text-gray-400">전화번호로 조회</p>
          <div className="flex gap-2">
            <input
              type="text"
              inputMode="numeric"
              value={phone}
              onChange={e => setPhone(formatPhone(e.target.value))}
              placeholder="010-0000-0000"
              className="flex-1 border border-gray-700 bg-gray-800 text-gray-100 rounded-xl px-3 py-3 text-lg tracking-wider outline-none focus:border-blue-500"
            />
            <button
              type="button"
              onClick={handleLookup}
              disabled={looking || phone.replace(/\D/g, '').length < 10}
              className={`px-5 rounded-xl text-base font-semibold transition ${
                phone.replace(/\D/g, '').length >= 10 && !looking
                  ? 'bg-blue-600 text-white active:bg-blue-700'
                  : 'bg-gray-700 text-gray-500'
              }`}
            >
              {looking ? '...' : '조회'}
            </button>
          </div>
          <p className="text-xs text-gray-500">기존 고객이면 카드가 열리고, 신규면 새 카드를 만듭니다.</p>
        </section>

        {errorMsg && (
          <div className="text-xs text-red-300 bg-red-950 rounded-xl px-3 py-2 break-all">{errorMsg}</div>
        )}

        {/* 최근 카드 목록 */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-400">최근 상담순</p>
          </div>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="상호명 또는 전화번호 검색"
            className="w-full border border-gray-700 bg-gray-800 text-gray-100 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-500"
          />
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
        </section>
      </div>
    </div>
  );
}

function CardForm({ customer, setCustomer, listing, setListing, isNew, saving, errorMsg, onSave, onBack }) {
  const [showAddrSearch, setShowAddrSearch] = useState(false);
  const [baseAddress, setBaseAddress] = useState(listing.address || '');
  const [addrDetail, setAddrDetail] = useState('');
  const addrRef = useRef(null);

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

      <div className="flex flex-col min-h-svh bg-gray-950">
        <header className="bg-gray-900 border-b border-gray-800 px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
          <button type="button" onClick={onBack} className="text-gray-400 text-sm">← 뒤로</button>
          <h1 className="text-lg font-bold text-gray-100">
            {isNew ? '새 매물카드' : '매물카드'}
          </h1>
          <span className="ml-auto text-sm text-gray-500">{customer.phone}</span>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5 pb-44">
          {/* 고객 정보 */}
          <section className="bg-gray-900 rounded-2xl p-4 space-y-4">
            <p className="text-sm font-semibold text-gray-500">고객 정보</p>
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
            disabled={saving}
            className={`w-full py-4 rounded-2xl text-base font-semibold transition ${
              saving ? 'bg-gray-700 text-gray-500' : 'bg-blue-600 text-white active:bg-blue-700'
            }`}
          >
            {saving ? '저장 중...' : '카드 저장'}
          </button>
        </div>
      </div>
    </>
  );
}

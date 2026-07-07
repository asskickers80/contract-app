import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { formatCurrency, toKoreanDate } from '../lib/utils';

export default function ContractList({ onBack }) {
  const [contracts, setContracts] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(null);

  useEffect(() => {
    fetchContracts();
  }, []);

  async function fetchContracts() {
    setLoading(true);
    const { data } = await supabase
      .from('contracts')
      .select('*')
      .order('signed_at', { ascending: false })
      .limit(100);
    setContracts(data || []);
    setLoading(false);
  }

  const filtered = contracts.filter(c =>
    c.store_name?.includes(query) || c.signed_at?.startsWith(query)
  );

  async function handleReshare(contract) {
    setSharing(contract.id);
    try {
      const { data: urlData } = await supabase.storage
        .from('contracts')
        .createSignedUrl(contract.pdf_path, 60 * 5);

      const resp = await fetch(urlData.signedUrl);
      const blob = await resp.blob();
      const fileName = contract.pdf_path.split('/').pop();
      const file = new File([blob], fileName, { type: 'application/pdf' });

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: fileName });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSharing(null);
    }
  }

  return (
    <div className="flex flex-col min-h-svh bg-gray-50">
      <header className="bg-white border-b px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center gap-3 mb-3">
          <button type="button" onClick={onBack} className="text-gray-500 text-sm">← 뒤로</button>
          <h1 className="text-lg font-bold text-gray-800">계약 목록</h1>
        </div>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="상호명 또는 날짜(2026-07) 검색"
          className="w-full border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400"
        />
      </header>

      <div className="flex-1 overflow-y-auto divide-y bg-white">
        {loading && (
          <p className="text-center text-gray-400 py-12">불러오는 중...</p>
        )}
        {!loading && filtered.length === 0 && (
          <p className="text-center text-gray-400 py-12">계약 내역이 없습니다.</p>
        )}
        {filtered.map(c => (
          <div key={c.id} className="px-4 py-4 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-800 truncate">{c.store_name}</p>
              <p className="text-sm text-gray-500">{c.business_type} · {formatCurrency(c.total_fee)}원</p>
              <p className="text-xs text-gray-400 mt-0.5">{c.signed_at ? toKoreanDate(c.signed_at.split('T')[0]) : ''}</p>
            </div>
            <button
              type="button"
              onClick={() => handleReshare(c)}
              disabled={sharing === c.id}
              className="flex-shrink-0 px-3 py-2 bg-blue-50 text-blue-700 rounded-xl text-sm font-medium"
            >
              {sharing === c.id ? '...' : '재공유'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

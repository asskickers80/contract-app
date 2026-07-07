import { useState, useEffect } from 'react';
import { useContract } from '../context/ContractContext';
import { generateContractPdf } from '../lib/generatePdf';
import { supabase } from '../lib/supabase';
import { formatCurrency, toKoreanDate } from '../lib/utils';

export default function Step3Done({ onNew }) {
  const { data, update } = useContract();
  const [status, setStatus] = useState('generating'); // generating | uploading | done | error
  const [errorMsg, setErrorMsg] = useState('');
  const [pdfBlob, setPdfBlob] = useState(null);
  const [shareResult, setShareResult] = useState(null);

  useEffect(() => {
    generate();
  }, []);

  async function generate() {
    setStatus('generating');
    try {
      const blob = await generateContractPdf(data.canvasDataUrl);
      setPdfBlob(blob);
      setStatus('uploading');
      await saveToSupabase(blob);
      setStatus('done');
    } catch (e) {
      console.error(e);
      setErrorMsg(e?.message || e?.error_description || JSON.stringify(e));
      setStatus('error');
    }
  }

  async function saveToSupabase(blob) {
    const dateStr = data.signedAt?.split('T')[0].replace(/-/g, '') || 'unknown';
    const ts = Date.now();
    const path = `contracts/${dateStr}_${ts}.pdf`;

    const { error: uploadErr } = await supabase.storage
      .from('contracts')
      .upload(path, blob, { contentType: 'application/pdf', upsert: true });
    if (uploadErr) throw uploadErr;

    const { data: row, error: insertErr } = await supabase
      .from('contracts')
      .insert({
        store_name:    data.storeName,
        business_type: data.businessType,
        biz_number:    data.bizNumber,
        address:       data.address,
        agent_name:    data.agentName,
        ad_fee:        data.adFee,
        vat:           data.vat,
        total_fee:     data.totalFee,
        start_date:    data.startDate,
        end_date:      data.endDate,
        period:        data.period,
        signed_at:     data.signedAt,
        pdf_path:      path,
        device_info:   { userAgent: navigator.userAgent },
      })
      .select('id')
      .single();
    if (insertErr) throw insertErr;
    update({ contractId: row.id, pdfPath: path });
  }

  async function handleShare() {
    if (!pdfBlob) return;
    const dateStr = data.signedAt?.split('T')[0].replace(/-/g, '') || 'unknown';
    const fileName = `계약서_${data.storeName}_${dateStr}.pdf`;
    const file = new File([pdfBlob], fileName, { type: 'application/pdf' });

    try {
      await navigator.share({ files: [file], title: fileName });
      setShareResult('shared');
    } catch (e) {
      if (e.name === 'AbortError') return;
      // share API 미지원 시 새 탭에서 PDF 열기
      const url = URL.createObjectURL(pdfBlob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 30000);
      setShareResult('downloaded');
    }
  }

  function handlePayment() {
    update({ paymentOpenedAt: new Date().toISOString() });
    window.open('https://m.jumpoline.com/help_cash2.asp', '_blank');
  }

  const statusLabel = {
    generating: 'PDF 생성 중...',
    uploading:  '저장 중...',
    done:       '저장 완료',
    error:      '오류 발생',
  }[status];

  return (
    <div className="flex flex-col min-h-svh bg-gray-50">
      <header className="bg-white border-b px-4 py-4 sticky top-0 z-10">
        <h1 className="text-lg font-bold text-gray-800">계약 완료</h1>
        <p className="text-sm text-gray-500 mt-0.5">{statusLabel}</p>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4 pb-6">

        {/* 요약 */}
        <div className="bg-white rounded-2xl p-4 space-y-2">
          {[
            ['상호',    data.storeName],
            ['업종',    data.businessType],
            ['광고료',  `${formatCurrency(data.totalFee)}원`],
            ['서명일',  data.signedAt ? toKoreanDate(data.signedAt.split('T')[0]) : ''],
          ].map(([label, val]) => (
            <div key={label} className="flex justify-between text-sm">
              <span className="text-gray-500">{label}</span>
              <span className="font-medium">{val}</span>
            </div>
          ))}
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">저장 상태</span>
            <span className={`font-medium ${status === 'done' ? 'text-green-600' : status === 'error' ? 'text-red-500' : 'text-yellow-500'}`}>
              {status === 'done' ? '✓ 저장됨' : status === 'error' ? '실패' : '처리 중...'}
            </span>
          </div>
          {status === 'error' && errorMsg && (
            <div className="text-xs text-red-400 bg-red-50 rounded-xl px-3 py-2 break-all">
              {errorMsg}
            </div>
          )}
        </div>

        {/* 고객 전달 */}
        <div className="bg-white rounded-2xl p-4 space-y-3">
          <p className="text-sm font-semibold text-gray-700">고객에게 전달</p>
          <button
            type="button"
            onClick={handleShare}
            disabled={!pdfBlob}
            className={`w-full py-4 rounded-xl text-base font-semibold transition ${
              pdfBlob ? 'bg-blue-600 text-white active:bg-blue-700' : 'bg-gray-200 text-gray-400'
            }`}
          >
            {shareResult === 'shared' ? '✓ 전달 완료' : shareResult === 'downloaded' ? '✓ 다운로드됨' : '고객에게 보내기'}
          </button>
          {shareResult === 'downloaded' && (
            <p className="text-xs text-center text-gray-400">파일 앱에서 직접 공유하세요.</p>
          )}
        </div>

        {/* 결제 */}
        <div className="bg-white rounded-2xl p-4 space-y-3">
          <p className="text-sm font-semibold text-gray-700">광고료 결제</p>
          <div className="bg-gray-50 rounded-xl px-3 py-3">
            <p className="text-xs text-gray-400">총액</p>
            <p className="text-2xl font-bold text-gray-800">
              {formatCurrency(data.totalFee)}<span className="text-sm ml-1">원</span>
            </p>
            <p className="text-sm text-gray-500 mt-1">매물광고료 — {data.storeName}</p>
          </div>

          <button
            type="button"
            onClick={handlePayment}
            className="w-full py-4 rounded-xl text-base font-semibold bg-orange-500 text-white active:bg-orange-600 transition"
          >
            결제하기 →
          </button>
        </div>

        <button
          type="button"
          onClick={onNew}
          className="w-full py-4 rounded-2xl text-base font-medium bg-white border border-gray-200 text-gray-600 active:bg-gray-50"
        >
          처음으로 돌아가기
        </button>
      </div>
    </div>
  );
}

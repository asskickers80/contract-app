import { createContext, useContext, useState } from 'react';
import { todayStr, addMonths } from '../lib/utils';

const ContractContext = createContext(null);

function makeInitial() {
  const today = todayStr();
  return {
    storeName: '',
    businessType: '',
    bizNumber: '',
    address: '',
    agentName: '김태우',
    productName: '',
    adFee: '',
    vat: '',
    totalFee: '',
    startDate: today,
    period: 3,
    endDate: addMonths(today, 3),
    signedAt: null,
    canvasDataUrl: null,
    contractId: null,
    pdfPath: null,
    paymentOpenedAt: null,
  };
}

export function ContractProvider({ children }) {
  const [data, setData] = useState(makeInitial);

  function update(patch) {
    setData(prev => {
      const next = { ...prev, ...patch };
      if (patch.startDate || patch.period) {
        next.endDate = addMonths(
          patch.startDate ?? prev.startDate,
          patch.period ?? prev.period,
        );
      }
      return next;
    });
  }

  function reset() {
    setData(makeInitial());
  }

  return (
    <ContractContext.Provider value={{ data, update, reset }}>
      {children}
    </ContractContext.Provider>
  );
}

export function useContract() {
  return useContext(ContractContext);
}

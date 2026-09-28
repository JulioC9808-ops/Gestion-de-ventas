import { useState, useEffect, useCallback } from 'react';

type Listener = (open: boolean) => void;
const listeners = new Set<Listener>();
let isReceiptModalOpen = false;

export const receiptModalStore = {
  getIsOpen: () => isReceiptModalOpen,
  open: () => {
    isReceiptModalOpen = true;
    listeners.forEach(cb => cb(true));
  },
  close: () => {
    isReceiptModalOpen = false;
    listeners.forEach(cb => cb(false));
  },
  toggle: () => {
    isReceiptModalOpen = !isReceiptModalOpen;
    listeners.forEach(cb => cb(isReceiptModalOpen));
  },
  subscribe: (cb: Listener) => {
    listeners.add(cb);
    return () => {
      listeners.delete(cb);
    };
  },
};

export function useReceiptModal() {
  const [isOpen, setIsOpen] = useState(receiptModalStore.getIsOpen());

  useEffect(() => {
    const unsub = receiptModalStore.subscribe(setIsOpen);
    return unsub;
  }, []);

  const openReceipt = useCallback(() => receiptModalStore.open(), []);
  const closeReceipt = useCallback(() => receiptModalStore.close(), []);

  return {
    isOpen,
    openReceipt,
    closeReceipt,
  };
}

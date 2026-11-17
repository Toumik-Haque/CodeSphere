import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';

import ActionNotice from '../components/ActionNotice';

const NoticeContext = createContext(null);

export function NoticeProvider({ children }) {
  const [notices, setNotices] = useState([]);
  const nextId = useRef(0);

  const dismissNotice = useCallback((id) => {
    setNotices((current) => current.filter((notice) => notice.id !== id));
  }, []);

  const showNotice = useCallback((nextNotice) => {
    const normalized = typeof nextNotice === 'string'
      ? { message: nextNotice }
      : nextNotice;

    nextId.current += 1;
    const notice = { ...normalized, id: nextId.current };
    setNotices((current) => [...current, notice].slice(-3));
  }, []);

  const value = useMemo(
    () => ({ showNotice, dismissNotice }),
    [showNotice, dismissNotice]
  );

  return (
    <NoticeContext.Provider value={value}>
      {children}
      <ActionNotice notices={notices} onClose={dismissNotice} />
    </NoticeContext.Provider>
  );
}

export function useNotice() {
  const context = useContext(NoticeContext);

  if (!context) {
    throw new Error('useNotice must be used within NoticeProvider.');
  }

  return context;
}

import { useEffect, useState } from 'react';
import './Toast.css';

export default function Toast({ message, visible, type = 'value' }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (visible) {
      setShow(true);
      const t = setTimeout(() => setShow(false), 3500);
      return () => clearTimeout(t);
    }
  }, [visible]);

  if (!show) return null;

  return (
    <div className={`toast toast--${type} animate-toast`}>
      <span className="toast-icon">{type === 'value' ? '💰' : '🔄'}</span>
      <span className="toast-msg">{message}</span>
    </div>
  );
}

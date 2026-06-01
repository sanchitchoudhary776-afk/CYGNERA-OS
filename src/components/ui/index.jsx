import { createPortal } from 'react-dom';

// ── Portal (renders to document.body, escaping transform/contain ancestors) ──
export function Portal({ children }) {
  return createPortal(children, document.body);
}

export { ThemeToggle } from './ThemeToggle';

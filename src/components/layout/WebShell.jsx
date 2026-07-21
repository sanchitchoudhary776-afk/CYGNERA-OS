import AppLayout from './AppLayout';

/**
 * WebShell
 * Isolates standard browser environment controls and features.
 */
export default function WebShell({ children }) {
  return <AppLayout>{children}</AppLayout>;
}

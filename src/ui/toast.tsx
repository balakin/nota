import { useEffect } from 'react';

const VISIBLE_MS = 4000;

/**
 * A transient confirmation for an action that leaves no other trace on screen. It is announced
 * politely rather than trapping focus: the action has already happened, there is nothing to answer.
 */
export function Toast({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss: () => void;
}) {
  useEffect(() => {
    const timer = window.setTimeout(onDismiss, VISIBLE_MS);
    return () => window.clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className="toast" role="status">
      {message}
    </div>
  );
}

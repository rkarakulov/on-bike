import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * Системная настройка «Уменьшить движение». `null` — ответ ещё не получен: анимацию в это время
 * не запускаем, иначе при включённой настройке успеет мигнуть пульс.
 */
export function useReducedMotion(): boolean | null {
  const [reduced, setReduced] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (active) setReduced(value);
    });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  return reduced;
}

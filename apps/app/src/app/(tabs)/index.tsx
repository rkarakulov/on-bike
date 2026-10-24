import { t } from '@on-bike/i18n';
import { TextAction } from '@rkarakulov/ui';
import { useRouter } from 'expo-router';
import { useState } from 'react';

import { ScreenPlaceholder } from '@/components/screen-placeholder';
import { useSignOut } from '@/features/auth/use-sign-out';

export default function HomeScreen() {
  const router = useRouter();
  const signOut = useSignOut();
  const [signingOut, setSigningOut] = useState(false);

  const onSignOut = async () => {
    setSigningOut(true);
    // экран уйдёт по гарду; неудачи нет — офлайн выход локальный
    await signOut();
  };

  return (
    <ScreenPlaceholder title="home.title">
      {__DEV__ ? (
        <TextAction label={t('uiKit.open')} onPress={() => router.push('/ui-kit')} />
      ) : null}
      {/* временно на «Главной» (Q7 слайса 2) — до экрана профиля */}
      <TextAction
        label={t('auth.signOut')}
        onPress={() => void onSignOut()}
        disabled={signingOut}
      />
    </ScreenPlaceholder>
  );
}

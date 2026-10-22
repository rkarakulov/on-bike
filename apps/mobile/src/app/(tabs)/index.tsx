import { t } from '@on-bike/i18n';
import { TextAction } from '@rkarakulov/ui';
import { useRouter } from 'expo-router';

import { ScreenPlaceholder } from '@/components/screen-placeholder';

export default function HomeScreen() {
  const router = useRouter();

  return (
    <ScreenPlaceholder title="home.title">
      {__DEV__ ? (
        <TextAction label={t('uiKit.open')} onPress={() => router.push('/ui-kit')} />
      ) : null}
    </ScreenPlaceholder>
  );
}

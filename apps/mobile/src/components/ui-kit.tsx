import { ApiHttpError, ApiNetworkError } from '@on-bike/api-client';
import { size, space } from '@on-bike/design-tokens';
import { t } from '@on-bike/i18n';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  Avatar,
  AvatarStack,
  Banner,
  Button,
  Checkbox,
  Chip,
  EmptyState,
  Kicker,
  Pill,
  SectionHeader,
  SegmentedControl,
  SkeletonGroup,
  SkeletonHeroCard,
  SkeletonListRow,
  TextAction,
  TextField,
  Toggle,
} from '@/components/ui';
import { AsyncContent, type AsyncState } from '@/components/async-content';
import { useTheme } from '@/theme/theme';

import photo from '../../assets/images/icon.png';

const clusters = [
  { key: 'strong', label: t('uiKit.segment.strong') },
  { key: 'medium', label: t('uiKit.segment.medium') },
  { key: 'beginner', label: t('uiKit.segment.beginner') },
] as const;

const noop = () => undefined;

/** Статичные состояния запроса для витрины (AGENTS.md §4.12). */
const demoQuery = (patch: Partial<AsyncState<string>>): AsyncState<string> => ({
  data: undefined,
  error: null,
  isPending: false,
  isError: false,
  fetchStatus: 'idle',
  refetch: noop,
  ...patch,
});
const networkFailure = demoQuery({ isError: true, error: new ApiNetworkError(null) });
const serverFailure = demoQuery({ isError: true, error: new ApiHttpError(503, null) });
const staleData = demoQuery({ data: 'stale', isError: true, error: new ApiNetworkError(null) });

/** Все компоненты `components/ui` во всех состояниях — для визуальной проверки в светлой и тёмной теме. */
export function UiKit() {
  const theme = useTheme();
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(true);
  const [darkPreview, setDarkPreview] = useState(false);
  const [gravel, setGravel] = useState(true);
  const [cluster, setCluster] = useState<(typeof clusters)[number]['key']>('strong');

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.surface.default }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <SectionHeader kicker={t('uiKit.kicker')} title={t('uiKit.title')} />

        <Section title={t('uiKit.section.buttons')}>
          <Button label={t('uiKit.primary')} onPress={noop} />
          <Button label={t('uiKit.secondary')} variant="secondary" onPress={noop} />
          <Button label={t('uiKit.disabled')} disabled />
          <Button label={t('uiKit.disabled')} variant="secondary" disabled />
          <TextAction label={t('uiKit.textAction')} onPress={noop} />
          <TextAction label={t('uiKit.textActionDestructive')} destructive onPress={noop} />
          <TextAction label={t('uiKit.disabled')} disabled />
          <View style={[styles.photo, { backgroundColor: theme.overlay.scrim }]}>
            <Button label={t('uiKit.primary')} variant="secondary" onPhoto onPress={noop} />
          </View>
        </Section>

        <Section title={t('uiKit.section.labels')}>
          <Kicker label={t('section.routes')} tag={t('uiKit.kickerTag')} />
          <View style={styles.row}>
            <Pill label={t('uiKit.pillVerified')} tone="success" />
            <Pill label={t('uiKit.pillStart')} />
            <Pill label={t('uiKit.pillRevised')} tone="warning" />
            <Pill label={t('uiKit.pillDq')} tone="error" />
            <Pill label={t('uiKit.kickerTag')} tone="accent" />
          </View>
          <View style={styles.row}>
            <Chip
              label={t('uiKit.chipGravel')}
              selected={gravel}
              onPress={() => setGravel(!gravel)}
            />
            <Chip label={t('uiKit.chipNearby')} onPress={noop} />
          </View>
          <SegmentedControl segments={clusters} selected={cluster} onChange={setCluster} />
        </Section>

        <Section title={t('uiKit.section.banners')}>
          <Banner message={t('uiKit.bannerInfo')} onPress={noop} />
          <Banner
            tone="warning"
            title={t('uiKit.bannerWarningTitle')}
            message={t('uiKit.bannerWarning')}
          />
          <Banner
            tone="error"
            title={t('uiKit.bannerErrorTitle')}
            message={t('uiKit.bannerError')}
          />
        </Section>

        <Section title={t('uiKit.section.fields')}>
          <TextField
            label={t('uiKit.fieldEmail')}
            placeholder={t('uiKit.fieldEmailPlaceholder')}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
          />
          <TextField
            label={t('uiKit.fieldBirth')}
            value="12.05.2010"
            error={t('uiKit.fieldBirthError')}
          />
          <TextField label={t('uiKit.fieldDisabled')} value={t('uiKit.chipGravel')} disabled />
          <Checkbox label={t('uiKit.checkbox')} checked={consent} onChange={setConsent} />
          <Checkbox label={t('uiKit.disabled')} checked={false} onChange={noop} disabled />
          <Toggle label={t('uiKit.toggle')} value={darkPreview} onChange={setDarkPreview} />
          <Toggle label={t('uiKit.disabled')} value={false} onChange={noop} disabled />
        </Section>

        <Section title={t('uiKit.section.people')}>
          <View style={styles.row}>
            <Avatar label="1" />
            <Avatar label="2" source={photo} />
          </View>
          <AvatarStack
            people={[{ label: '1' }, { label: '2' }, { label: '3' }, { label: '4' }]}
            caption={t('uiKit.going')}
          />
        </Section>

        <Section title={t('uiKit.section.loading')}>
          <SkeletonGroup>
            <SkeletonHeroCard />
            <SkeletonListRow />
            <SkeletonListRow />
          </SkeletonGroup>
          {[networkFailure, serverFailure, staleData].map((query, index) => (
            <AsyncContent key={index} query={query} skeleton={null}>
              {() => <Kicker label={t('section.routes')} />}
            </AsyncContent>
          ))}
        </Section>

        <Section title={t('uiKit.section.empty')}>
          <EmptyState
            title={t('uiKit.emptyTitle')}
            message={t('uiKit.emptyMessage')}
            action={{ label: t('uiKit.emptyAction'), onPress: noop }}
          />
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Kicker label={title} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { padding: size.gutter, gap: size.sectionGap },
  section: { gap: space.s3 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s2 },
  // подложка «фото» для вариантов on-photo
  photo: { padding: size.gutter },
});

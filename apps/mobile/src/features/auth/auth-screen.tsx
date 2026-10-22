import { size, space } from '@on-bike/design-tokens';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Kicker } from '@/components/ui';
import { textStyle } from '@/theme/fonts';
import { useTheme } from '@/theme/theme';

interface AuthScreenProps {
  /** постоянная шапка сценария («Регистрация») — видна сразу, даже пока данные экрана грузятся (§4.12) */
  kicker?: string;
  /** заголовок Playfair 28; без него заголовок рисует содержимое (`AuthTitle`) — когда он зависит от данных */
  title?: string;
  /** вводный текст под заголовком */
  lead?: string;
  children?: ReactNode;
}

/** Каркас экранов регистрации и подтверждения: safe area, прокрутка над клавиатурой, заголовок и текст. */
export function AuthScreen({ kicker, title, lead, children }: AuthScreenProps) {
  const theme = useTheme();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.surface.default }]}>
      <KeyboardAvoidingView
        style={styles.safeArea}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {kicker ? <Kicker label={kicker} /> : null}
          {title ? <AuthTitle>{title}</AuthTitle> : null}
          {lead ? <AuthText>{lead}</AuthText> : null}
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** Заголовок экрана: Playfair 500 28/34. */
export function AuthTitle({ children }: { children: string }) {
  const theme = useTheme();
  return (
    <Text
      accessibilityRole="header"
      style={[textStyle('displayTitle'), { color: theme.text.primary }]}
    >
      {children}
    </Text>
  );
}

/** Абзац экрана: body; `tone="secondary"` — пояснения (ink-2). */
export function AuthText({
  children,
  tone = 'primary',
}: {
  children: ReactNode;
  tone?: 'primary' | 'secondary';
}) {
  const theme = useTheme();
  return (
    <Text
      style={[
        textStyle('body'),
        { color: tone === 'primary' ? theme.text.primary : theme.text.secondary },
      ]}
    >
      {children}
    </Text>
  );
}

/** Мета-строка (`.t-meta`, ink-2): отсчёт повтора, «Уже есть аккаунт?». */
export function AuthMeta({ children }: { children: ReactNode }) {
  const theme = useTheme();
  return <Text style={[textStyle('meta'), { color: theme.text.secondary }]}>{children}</Text>;
}

/** Строка «вопрос + текстовое действие»: «Уже есть аккаунт? Войти». */
export function AuthInline({ children }: { children: ReactNode }) {
  return <View style={styles.inline}>{children}</View>;
}

/** Вертикальная стопка с шагом экрана (скелетон, вложенные блоки). */
export function AuthStack({ children }: { children: ReactNode }) {
  return <View style={styles.stack}>{children}</View>;
}

/** Блок действий экрана с отступом от текста. */
export function AuthActions({ children }: { children: ReactNode }) {
  return <View style={styles.actions}>{children}</View>;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { padding: size.gutter, paddingTop: space.s6, gap: space.s3 },
  stack: { gap: space.s3 },
  inline: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.s2 },
  actions: { marginTop: space.s4, gap: space.s3 },
});

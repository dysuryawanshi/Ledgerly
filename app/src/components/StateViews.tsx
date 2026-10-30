import type { ComponentProps, ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Avatar, Button, Card, Text } from 'react-native-paper';
import { palette } from '../lib/theme';

type IconName = ComponentProps<typeof Avatar.Icon>['icon'];

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <View style={styles.center} accessibilityRole="progressbar" accessibilityLabel={label}>
      <ActivityIndicator size="large" />
      <Text variant="bodyMedium" style={styles.muted}>
        {label}
      </Text>
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={styles.center}>
      <Card mode="contained" style={styles.errorCard}>
        <Card.Content style={styles.cardContent}>
          <Avatar.Icon icon="cloud-alert-outline" size={56} color={palette.danger} style={styles.errorIcon} />
          <Text variant="titleMedium" style={styles.title}>
            We couldn't load this
          </Text>
          <Text variant="bodyMedium" style={styles.body}>
            {message}
          </Text>
          {onRetry ? (
            <Button mode="contained" icon="refresh" onPress={onRetry} style={styles.action}>
              Try again
            </Button>
          ) : null}
        </Card.Content>
      </Card>
    </View>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: IconName;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <View style={styles.empty}>
      <Avatar.Icon icon={icon} size={72} color={palette.green} style={styles.emptyIcon} />
      <Text variant="titleMedium" style={styles.title}>
        {title}
      </Text>
      <Text variant="bodyMedium" style={styles.body}>
        {body}
      </Text>
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

export function SuccessState({ title, body }: { title: string; body?: string }) {
  return (
    <View style={styles.center} accessibilityLiveRegion="polite">
      <Avatar.Icon icon="check-circle" size={80} color="#FFFFFF" style={styles.successIcon} />
      <Text variant="headlineSmall" style={styles.title}>
        {title}
      </Text>
      {body ? (
        <Text variant="bodyMedium" style={styles.body}>
          {body}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, minHeight: 280, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  muted: { color: palette.muted },
  errorCard: { width: '100%', maxWidth: 420, backgroundColor: '#FBEDEA' },
  cardContent: { alignItems: 'center', gap: 8, paddingVertical: 20 },
  errorIcon: { backgroundColor: '#F6D9D4' },
  title: { textAlign: 'center', color: palette.ink, marginTop: 4 },
  body: { textAlign: 'center', color: palette.muted, maxWidth: 320 },
  action: { marginTop: 12 },
  empty: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 24, gap: 8 },
  emptyIcon: { backgroundColor: palette.greenSoft },
  successIcon: { backgroundColor: palette.green },
});

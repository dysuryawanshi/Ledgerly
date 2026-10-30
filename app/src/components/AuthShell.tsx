import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { palette } from '../lib/theme';

/** Brand hero shared by the sign-in and create-account screens. */
export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.hero}>
            <View style={styles.mark} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              <View style={[styles.bar, { height: 14 }]} />
              <View style={[styles.bar, { height: 22 }]} />
              <View style={[styles.bar, styles.barAccent, { height: 32 }]} />
            </View>
            <Text variant="labelLarge" style={styles.brand}>
              LEDGERLY
            </Text>
            <Text variant="headlineMedium" style={styles.title}>
              {title}
            </Text>
            <Text variant="bodyLarge" style={styles.subtitle}>
              {subtitle}
            </Text>
          </View>
          <View style={styles.card}>{children}</View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.cream },
  scroll: { flexGrow: 1, padding: 20, justifyContent: 'center', maxWidth: 480, width: '100%', alignSelf: 'center' },
  hero: {
    backgroundColor: palette.green,
    borderRadius: 24,
    padding: 24,
    paddingTop: 28,
    marginBottom: -24,
    paddingBottom: 48,
  },
  mark: { flexDirection: 'row', alignItems: 'flex-end', gap: 5, marginBottom: 16, height: 32 },
  bar: { width: 9, borderRadius: 3, backgroundColor: palette.cream },
  barAccent: { backgroundColor: '#C9A25E' },
  brand: { color: '#C9A25E', letterSpacing: 3 },
  title: { color: '#FFFFFF', marginTop: 6, fontWeight: '700' },
  subtitle: { color: '#D6E7DD', marginTop: 6 },
  card: {
    backgroundColor: palette.paper,
    borderRadius: 20,
    padding: 20,
    gap: 4,
    borderWidth: 1,
    borderColor: palette.line,
    marginHorizontal: 8,
  },
});

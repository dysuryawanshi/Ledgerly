import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Banner, Button, HelperText, Text, TextInput } from 'react-native-paper';
import { AuthShell } from '../../components/AuthShell';
import { CurrencyPicker } from '../../components/CurrencyPicker';
import { SuccessState } from '../../components/StateViews';
import { ApiError } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { currencyInfo } from '../../lib/currencies';
import { palette } from '../../lib/theme';

function guessCurrency(): string {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale;
    const region = locale.split('-').pop()?.toUpperCase();
    const map: Record<string, string> = {
      US: 'USD', GB: 'GBP', IN: 'INR', JP: 'JPY', CA: 'CAD', AU: 'AUD', DE: 'EUR', FR: 'EUR', ES: 'EUR',
      IT: 'EUR', NL: 'EUR', IE: 'EUR', SG: 'SGD', AE: 'AED', BR: 'BRL', MX: 'MXN', ZA: 'ZAR', CH: 'CHF',
    };
    return (region && map[region]) || 'USD';
  } catch {
    return 'USD';
  }
}

export default function SignUp() {
  const { register, activate } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [currency, setCurrency] = useState(guessCurrency);
  const [picker, setPicker] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState<string | null>(null);

  useEffect(() => {
    if (!created) return;
    const t = setTimeout(activate, 1100);
    return () => clearTimeout(t);
  }, [created, activate]);

  async function submit() {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Enter your name';
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) errs.email = 'Enter a valid email';
    if (password.length < 8) errs.password = 'Use at least 8 characters';
    setFieldErrors(errs);
    setError(null);
    if (Object.keys(errs).length) return;
    setLoading(true);
    try {
      const user = await register({ name: name.trim(), email: email.trim(), password, currency });
      setCreated(user.name.split(' ')[0]);
    } catch (e) {
      if (e instanceof ApiError) {
        setFieldErrors(e.fields);
        setError(e.message);
      } else setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (created) {
    return (
      <View style={styles.success}>
        <SuccessState title={`You're all set, ${created}`} body={`Your ledger is ready in ${currency}. Let's add your first transaction.`} />
      </View>
    );
  }

  return (
    <AuthShell title="Create your ledger" subtitle="Track every dollar, euro and yen by hand — clearly.">
      <Banner visible={!!error} icon="alert-circle-outline" style={styles.banner} actions={[{ label: 'Dismiss', onPress: () => setError(null) }]}>
        {error}
      </Banner>
      <TextInput
        mode="outlined"
        label="Full name"
        value={name}
        onChangeText={setName}
        autoComplete="name"
        textContentType="name"
        error={!!fieldErrors.name}
        left={<TextInput.Icon icon="account-outline" />}
      />
      <HelperText type="error" visible={!!fieldErrors.name}>
        {fieldErrors.name}
      </HelperText>
      <TextInput
        mode="outlined"
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
        error={!!fieldErrors.email}
        left={<TextInput.Icon icon="email-outline" />}
      />
      <HelperText type="error" visible={!!fieldErrors.email}>
        {fieldErrors.email}
      </HelperText>
      <TextInput
        mode="outlined"
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        error={!!fieldErrors.password}
        left={<TextInput.Icon icon="lock-outline" />}
      />
      <HelperText type={fieldErrors.password ? 'error' : 'info'} visible>
        {fieldErrors.password ?? 'At least 8 characters'}
      </HelperText>
      <TextInput
        mode="outlined"
        label="Account currency"
        value={`${currency} · ${currencyInfo(currency).name}`}
        editable={false}
        error={!!fieldErrors.currency}
        left={<TextInput.Icon icon="cash-multiple" />}
        right={<TextInput.Icon icon="chevron-down" onPress={() => setPicker(true)} accessibilityLabel="Change currency" />}
        onPressIn={() => setPicker(true)}
      />
      <HelperText type={fieldErrors.currency ? 'error' : 'info'} visible>
        {fieldErrors.currency ?? 'Shown on every amount. You can still log other currencies.'}
      </HelperText>
      <Button mode="contained" onPress={submit} loading={loading} disabled={loading} contentStyle={styles.cta}>
        {loading ? 'Creating account…' : 'Create account'}
      </Button>
      <View style={styles.footer}>
        <Text variant="bodyMedium" style={styles.muted}>
          Already have an account?
        </Text>
        <Link href="/sign-in" asChild>
          <Button compact>Sign in</Button>
        </Link>
      </View>
      <CurrencyPicker
        visible={picker}
        value={currency}
        onDismiss={() => setPicker(false)}
        onSelect={(code) => {
          setCurrency(code);
          setPicker(false);
        }}
      />
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  success: { flex: 1, backgroundColor: palette.cream },
  banner: { backgroundColor: '#FBEDEA', marginBottom: 8, borderRadius: 12 },
  cta: { height: 52 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 12, gap: 4 },
  muted: { color: palette.muted },
});

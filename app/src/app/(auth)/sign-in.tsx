import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Banner, Button, HelperText, Text, TextInput } from 'react-native-paper';
import { AuthShell } from '../../components/AuthShell';
import { SuccessState } from '../../components/StateViews';
import { ApiError } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { palette } from '../../lib/theme';

export default function SignIn() {
  const { signIn, activate } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [welcome, setWelcome] = useState<string | null>(null);

  useEffect(() => {
    if (!welcome) return;
    const t = setTimeout(activate, 900);
    return () => clearTimeout(t);
  }, [welcome, activate]);

  async function submit() {
    const errs: Record<string, string> = {};
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) errs.email = 'Enter a valid email';
    if (!password) errs.password = 'Enter your password';
    setFieldErrors(errs);
    setError(null);
    if (Object.keys(errs).length) return;
    setLoading(true);
    try {
      const user = await signIn(email.trim(), password);
      setWelcome(user.name.split(' ')[0]);
    } catch (e) {
      if (e instanceof ApiError) {
        setFieldErrors(e.fields);
        setError(e.message);
      } else setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (welcome) {
    return (
      <View style={styles.success}>
        <SuccessState title={`Welcome back, ${welcome}`} body="Opening your ledger…" />
      </View>
    );
  }

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to see where your money went this month.">
      <Banner visible={!!error} icon="alert-circle-outline" style={styles.banner} actions={[{ label: 'Dismiss', onPress: () => setError(null) }]}>
        {error}
      </Banner>
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
        secureTextEntry={!showPassword}
        autoComplete="password"
        textContentType="password"
        onSubmitEditing={submit}
        error={!!fieldErrors.password}
        left={<TextInput.Icon icon="lock-outline" />}
        right={
          <TextInput.Icon
            icon={showPassword ? 'eye-off-outline' : 'eye-outline'}
            onPress={() => setShowPassword((v) => !v)}
            accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
          />
        }
      />
      <HelperText type="error" visible={!!fieldErrors.password}>
        {fieldErrors.password}
      </HelperText>
      <Button mode="contained" onPress={submit} loading={loading} disabled={loading} contentStyle={styles.cta}>
        {loading ? 'Signing in…' : 'Sign in'}
      </Button>
      <View style={styles.footer}>
        <Text variant="bodyMedium" style={styles.muted}>
          New to Ledgerly?
        </Text>
        <Link href="/sign-up" asChild>
          <Button compact>Create an account</Button>
        </Link>
      </View>
      {__DEV__ ? (
        <View style={styles.demo}>
          <Text variant="labelMedium" style={styles.muted}>
            Demo accounts (password Ledgerly123!)
          </Text>
          <View style={styles.demoRow}>
            <Button compact mode="text" onPress={() => { setEmail('alex@ledgerly.app'); setPassword('Ledgerly123!'); }}>
              Alex · with data
            </Button>
            <Button compact mode="text" onPress={() => { setEmail('sam@ledgerly.app'); setPassword('Ledgerly123!'); }}>
              Sam · empty
            </Button>
          </View>
        </View>
      ) : null}
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  success: { flex: 1, backgroundColor: palette.cream },
  banner: { backgroundColor: '#FBEDEA', marginBottom: 8, borderRadius: 12 },
  cta: { height: 52 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 12, gap: 4 },
  muted: { color: palette.muted },
  demo: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: palette.line, alignItems: 'center' },
  demoRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
});

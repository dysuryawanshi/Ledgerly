import { Redirect } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { ErrorState, LoadingState } from '../components/StateViews';
import { useAuth } from '../lib/auth';
import { palette } from '../lib/theme';

export default function Index() {
  const { status, error, retry } = useAuth();

  if (status === 'signedIn') return <Redirect href="/home" />;
  if (status === 'signedOut') return <Redirect href="/sign-in" />;

  return (
    <View style={styles.root}>
      {status === 'error' ? (
        <ErrorState message={error ?? 'Could not restore your session.'} onRetry={retry} />
      ) : (
        <LoadingState label="Opening your ledger…" />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.cream },
});

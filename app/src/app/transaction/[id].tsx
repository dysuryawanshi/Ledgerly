import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Dialog, Portal, Text } from 'react-native-paper';
import { ErrorState, LoadingState, SuccessState } from '../../components/StateViews';
import { TransactionForm } from '../../components/TransactionForm';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { formatMoney } from '../../lib/format';
import { leave } from '../../lib/nav';
import { palette } from '../../lib/theme';
import { useToast } from '../../lib/toast';
import { useResource } from '../../lib/useResource';

export default function EditTransaction() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const toast = useToast();
  const tx = useResource(() => api.getTransaction(id).then((r) => r.transaction), [id]);
  const [done, setDone] = useState<{ title: string; body: string } | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!done) return;
    const t = setTimeout(leave, 900);
    return () => clearTimeout(t);
  }, [done]);

  async function remove() {
    setDeleting(true);
    try {
      await api.deleteTransaction(id);
      setConfirm(false);
      toast('Transaction deleted');
      setDone({ title: 'Transaction deleted', body: 'It has been removed from your ledger.' });
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not delete.', 'error');
    } finally {
      setDeleting(false);
    }
  }

  let body: React.ReactNode;
  if (done) body = <SuccessState title={done.title} body={done.body} />;
  else if (tx.loading && !tx.data) body = <LoadingState label="Loading transaction…" />;
  else if (tx.error && !tx.data) body = <ErrorState message={tx.error} onRetry={tx.retry} />;
  else if (tx.data) {
    const data = tx.data;
    body = (
      <TransactionForm
        key={data.updatedAt}
        initial={data}
        defaultCurrency={user?.currency ?? data.currency}
        submitLabel="Save changes"
        onSubmit={async (input) => {
          const { transaction } = await api.updateTransaction(id, input);
          toast('Changes saved');
          setDone({ title: 'Changes saved', body: formatMoney(transaction.amount, transaction.currency) });
        }}
        footer={
          <Button mode="text" icon="trash-can-outline" textColor={palette.danger} onPress={() => setConfirm(true)} style={styles.delete}>
            Delete transaction
          </Button>
        }
      />
    );
  }

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ title: 'Edit transaction' }} />
      {body}
      <Portal>
        <Dialog visible={confirm} onDismiss={() => !deleting && setConfirm(false)}>
          <Dialog.Icon icon="trash-can-outline" />
          <Dialog.Title style={styles.center}>Delete this transaction?</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              {tx.data ? `${formatMoney(tx.data.amount, tx.data.currency)} · ${tx.data.note || tx.data.category?.name || 'No note'}` : ''}
              {'\n'}This can't be undone.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setConfirm(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button onPress={remove} loading={deleting} disabled={deleting} textColor={palette.danger}>
              Delete
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.cream },
  delete: { marginTop: 12 },
  center: { textAlign: 'center' },
});

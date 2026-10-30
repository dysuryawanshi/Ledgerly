import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SuccessState } from '../../components/StateViews';
import { TransactionForm } from '../../components/TransactionForm';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { formatMoney } from '../../lib/format';
import { leave } from '../../lib/nav';
import { palette } from '../../lib/theme';
import { useToast } from '../../lib/toast';

export default function NewTransaction() {
  const { user } = useAuth();
  const toast = useToast();
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    if (!saved) return;
    const t = setTimeout(leave, 900);
    return () => clearTimeout(t);
  }, [saved]);

  if (saved) {
    return (
      <View style={styles.root}>
        <SuccessState title="Transaction saved" body={saved} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <TransactionForm
        defaultCurrency={user?.currency ?? 'USD'}
        submitLabel="Save transaction"
        onSubmit={async (input) => {
          const { transaction } = await api.createTransaction(input);
          const label = `${transaction.type === 'INCOME' ? 'Income' : 'Expense'} of ${formatMoney(transaction.amount, transaction.currency)}`;
          toast(`${label} saved`);
          setSaved(label);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.cream },
});

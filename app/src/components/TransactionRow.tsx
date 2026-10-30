import { StyleSheet } from 'react-native';
import { Avatar, List, Text } from 'react-native-paper';
import type { Transaction } from '../lib/api';
import { formatDay, formatMoney } from '../lib/format';
import { palette } from '../lib/theme';

export function TransactionRow({
  tx,
  onPress,
  showDate = true,
}: {
  tx: Transaction;
  onPress?: () => void;
  showDate?: boolean;
}) {
  const income = tx.type === 'INCOME';
  const color = tx.category?.color ?? (income ? palette.income : palette.muted);
  const title = tx.note || tx.category?.name || (income ? 'Income' : 'Expense');
  const meta = [tx.category?.name ?? 'Uncategorised', showDate ? formatDay(tx.date) : null].filter(Boolean).join(' · ');

  return (
    <List.Item
      onPress={onPress}
      title={title}
      titleNumberOfLines={1}
      description={meta}
      style={styles.item}
      accessibilityLabel={`${title}, ${income ? 'income' : 'expense'} ${formatMoney(tx.amount, tx.currency)}`}
      left={() => (
        <Avatar.Icon
          size={42}
          icon={tx.category?.icon ?? (income ? 'arrow-down-left' : 'arrow-up-right')}
          color={color}
          style={[styles.avatar, { backgroundColor: `${color}1F` }]}
        />
      )}
      right={() => (
        <Text variant="titleSmall" style={[styles.amount, { color: income ? palette.income : palette.ink }]}>
          {formatMoney(income ? tx.amount : `-${tx.amount}`, tx.currency, { sign: true })}
        </Text>
      )}
    />
  );
}

const styles = StyleSheet.create({
  item: { paddingVertical: 6 },
  avatar: { alignSelf: 'center', marginLeft: 8 },
  amount: { alignSelf: 'center', fontVariant: ['tabular-nums'], fontWeight: '600' },
});

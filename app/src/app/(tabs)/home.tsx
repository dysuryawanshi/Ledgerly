import { router } from 'expo-router';
import { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Avatar, Button, Card, Divider, FAB, IconButton, Menu, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState, ErrorState, LoadingState } from '../../components/StateViews';
import { TransactionRow } from '../../components/TransactionRow';
import { api, type Summary } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { currentMonthKey, formatMoney, formatMonth, greeting } from '../../lib/format';
import { palette } from '../../lib/theme';
import { useToast } from '../../lib/toast';
import { useResource } from '../../lib/useResource';

export default function Home() {
  const { user, signOut } = useAuth();
  const toast = useToast();
  const [menu, setMenu] = useState(false);
  const month = currentMonthKey();
  const summary = useResource(() => api.summary(month), [month]);

  async function onRefresh() {
    if (await summary.refresh()) toast('Up to date');
    else toast("Couldn't refresh. Pull to try again.", 'error');
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.flex}>
          <Text variant="bodyMedium" style={styles.muted}>
            {greeting()},
          </Text>
          <Text variant="headlineSmall" style={styles.name} numberOfLines={1}>
            {user?.name ?? 'there'}
          </Text>
        </View>
        <Menu
          visible={menu}
          onDismiss={() => setMenu(false)}
          anchor={
            <IconButton
              icon="account-circle-outline"
              size={30}
              iconColor={palette.green}
              onPress={() => setMenu(true)}
              accessibilityLabel="Account menu"
            />
          }
        >
          <Menu.Item title={user?.email ?? ''} leadingIcon="email-outline" disabled />
          <Menu.Item title={`Account currency: ${user?.currency ?? ''}`} leadingIcon="cash" disabled />
          <Divider />
          <Menu.Item
            title="Sign out"
            leadingIcon="logout"
            onPress={() => {
              setMenu(false);
              void signOut();
            }}
          />
        </Menu>
      </View>

      {summary.loading && !summary.data ? (
        <LoadingState label="Crunching this month's numbers…" />
      ) : summary.error && !summary.data ? (
        <ErrorState message={summary.error} onRetry={summary.retry} />
      ) : summary.data ? (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={summary.refreshing} onRefresh={onRefresh} tintColor={palette.green} />}
        >
          <Dashboard data={summary.data} />
        </ScrollView>
      ) : null}

      <FAB icon="plus" label="Add" style={styles.fab} color="#FFFFFF" onPress={() => router.push('/transaction/new')} />
    </SafeAreaView>
  );
}

function Dashboard({ data }: { data: Summary }) {
  const [primary, ...others] = data.currencies;
  const empty = data.transactionCount === 0;
  const maxCategory = Math.max(...data.topCategories.map((c) => Number(c.total)), 1);

  return (
    <View style={styles.stack}>
      {/* Hero: all-time balance and this month's flow in the account currency. */}
      <View style={styles.hero}>
        <Text variant="labelLarge" style={styles.heroLabel}>
          BALANCE · {primary.currency}
        </Text>
        <Text variant="displaySmall" style={styles.heroValue} adjustsFontSizeToFit numberOfLines={1}>
          {formatMoney(primary.balance, primary.currency)}
        </Text>
        <Text variant="bodyMedium" style={styles.heroSub}>
          {formatMonth(data.month)} · net {formatMoney(primary.net, primary.currency, { sign: true })}
        </Text>
        <View style={styles.tiles}>
          <View style={styles.tile}>
            <View style={styles.tileHead}>
              <Avatar.Icon size={28} icon="arrow-down-left" color={palette.green} style={styles.tileIconIn} />
              <Text variant="labelLarge" style={styles.tileLabel}>
                Income
              </Text>
            </View>
            <Text variant="titleMedium" style={styles.tileValue} numberOfLines={1} adjustsFontSizeToFit>
              {formatMoney(primary.income, primary.currency)}
            </Text>
          </View>
          <View style={styles.tile}>
            <View style={styles.tileHead}>
              <Avatar.Icon size={28} icon="arrow-up-right" color={palette.expense} style={styles.tileIconOut} />
              <Text variant="labelLarge" style={styles.tileLabel}>
                Spending
              </Text>
            </View>
            <Text variant="titleMedium" style={styles.tileValue} numberOfLines={1} adjustsFontSizeToFit>
              {formatMoney(primary.expense, primary.currency)}
            </Text>
          </View>
        </View>
      </View>

      {empty ? (
        <Card mode="outlined" style={styles.card}>
          <EmptyState
            icon="notebook-plus-outline"
            title="Your ledger is empty"
            body="Record your first income or expense and this month's balance, income and spending will appear here."
            action={
              <Button mode="contained" icon="plus" onPress={() => router.push('/transaction/new')}>
                Add first transaction
              </Button>
            }
          />
        </Card>
      ) : (
        <>
          {others.length > 0 ? (
            <Card mode="outlined" style={styles.card}>
              <Card.Title title="Other currencies" subtitle="Kept separate — never converted" />
              <Card.Content style={styles.others}>
                {others.map((c) => (
                  <View key={c.currency} style={styles.otherRow}>
                    <Text variant="titleSmall" style={styles.code}>
                      {c.currency}
                    </Text>
                    <View style={styles.flex}>
                      <Text variant="bodySmall" style={styles.muted}>
                        In {formatMoney(c.income, c.currency)} · Out {formatMoney(c.expense, c.currency)}
                      </Text>
                    </View>
                    <Text variant="titleSmall" style={styles.tabular}>
                      {formatMoney(c.balance, c.currency)}
                    </Text>
                  </View>
                ))}
              </Card.Content>
            </Card>
          ) : null}

          <Card mode="outlined" style={styles.card}>
            <Card.Title title="Where it went" subtitle={`Top spending in ${formatMonth(data.month)}`} />
            <Card.Content style={styles.bars}>
              {data.topCategories.length === 0 ? (
                <Text variant="bodyMedium" style={styles.muted}>
                  No {primary.currency} spending recorded this month yet.
                </Text>
              ) : (
                data.topCategories.map((c, i) => {
                  const color = c.category?.color ?? palette.muted;
                  return (
                    <View key={c.category?.id ?? `none-${i}`} style={styles.barRow}>
                      <View style={styles.barLabels}>
                        <Text variant="bodyMedium">{c.category?.name ?? 'Uncategorised'}</Text>
                        <Text variant="bodyMedium" style={styles.tabular}>
                          {formatMoney(c.total, primary.currency)}
                        </Text>
                      </View>
                      <View style={styles.track}>
                        <View style={[styles.fill, { width: `${(Number(c.total) / maxCategory) * 100}%`, backgroundColor: color }]} />
                      </View>
                    </View>
                  );
                })
              )}
            </Card.Content>
          </Card>

          <Card mode="outlined" style={styles.card}>
            <Card.Title
              title="Recent"
              right={() => (
                <Button compact onPress={() => router.push('/transactions')}>
                  See all
                </Button>
              )}
            />
            {data.recent.map((tx, i) => (
              <View key={tx.id}>
                {i > 0 ? <Divider /> : null}
                <TransactionRow tx={tx} onPress={() => router.push(`/transaction/${tx.id}`)} />
              </View>
            ))}
          </Card>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.cream },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 },
  name: { color: palette.ink, fontWeight: '700' },
  muted: { color: palette.muted },
  content: { padding: 16, paddingBottom: 112, maxWidth: 720, width: '100%', alignSelf: 'center' },
  stack: { gap: 16 },
  hero: { backgroundColor: palette.green, borderRadius: 24, padding: 20, gap: 4 },
  heroLabel: { color: '#C9A25E', letterSpacing: 1.5 },
  heroValue: { color: '#FFFFFF', fontWeight: '700', fontVariant: ['tabular-nums'] },
  heroSub: { color: '#BBD5C6' },
  tiles: { flexDirection: 'row', gap: 12, marginTop: 16 },
  tile: { flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 16, padding: 12, gap: 8 },
  tileHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tileIconIn: { backgroundColor: palette.greenSoft },
  tileIconOut: { backgroundColor: '#F6E0D3' },
  tileLabel: { color: '#D6E7DD' },
  tileValue: { color: '#FFFFFF', fontWeight: '700', fontVariant: ['tabular-nums'] },
  card: { backgroundColor: palette.paper, borderColor: palette.line },
  others: { gap: 12 },
  otherRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  code: { width: 44, color: palette.green },
  tabular: { fontVariant: ['tabular-nums'] },
  bars: { gap: 14, paddingBottom: 8 },
  barRow: { gap: 6 },
  barLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  track: { height: 8, borderRadius: 4, backgroundColor: palette.sand, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4 },
  fab: { position: 'absolute', right: 16, bottom: 16, backgroundColor: palette.green },
});

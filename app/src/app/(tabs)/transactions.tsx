import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { RefreshControl, SectionList, StyleSheet, View } from 'react-native';
import { Button, Divider, FAB, Searchbar, SegmentedButtons, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState, ErrorState, LoadingState } from '../../components/StateViews';
import { TransactionRow } from '../../components/TransactionRow';
import { api, type Transaction, type TxType } from '../../lib/api';
import { formatDay } from '../../lib/format';
import { palette } from '../../lib/theme';
import { useToast } from '../../lib/toast';
import { useResource } from '../../lib/useResource';

type Filter = 'ALL' | TxType;

export default function Transactions() {
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [filter, setFilter] = useState<Filter>('ALL');

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  const list = useResource(
    () =>
      api
        .listTransactions({ q: debounced || undefined, type: filter === 'ALL' ? undefined : filter })
        .then((r) => r.transactions),
    [debounced, filter],
  );

  const sections = useMemo(() => groupByDay(list.data ?? []), [list.data]);
  const filtered = debounced !== '' || filter !== 'ALL';

  async function onRefresh() {
    if (await list.refresh()) toast('Transactions refreshed');
    else toast("Couldn't refresh. Pull to try again.", 'error');
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <Text variant="headlineSmall" style={styles.title}>
          Transactions
        </Text>
        <Searchbar
          placeholder="Search notes, categories, currency"
          value={query}
          onChangeText={setQuery}
          style={styles.search}
          inputStyle={styles.searchInput}
          loading={list.loading && !!list.data}
        />
        <SegmentedButtons
          value={filter}
          onValueChange={(v) => setFilter(v as Filter)}
          buttons={[
            { value: 'ALL', label: 'All' },
            { value: 'INCOME', label: 'Income', icon: 'arrow-down-left' },
            { value: 'EXPENSE', label: 'Expense', icon: 'arrow-up-right' },
          ]}
        />
      </View>

      {list.loading && !list.data ? (
        <LoadingState label="Loading transactions…" />
      ) : list.error && !list.data ? (
        <ErrorState message={list.error} onRetry={list.retry} />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(t) => t.id}
          contentContainerStyle={styles.list}
          stickySectionHeadersEnabled={false}
          refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={onRefresh} tintColor={palette.green} />}
          renderSectionHeader={({ section }) => (
            <Text variant="labelLarge" style={styles.section}>
              {section.title}
            </Text>
          )}
          renderItem={({ item, index, section }) => (
            <View style={[styles.rowWrap, index === 0 && styles.first, index === section.data.length - 1 && styles.last]}>
              {index > 0 ? <Divider /> : null}
              <TransactionRow tx={item} showDate={false} onPress={() => router.push(`/transaction/${item.id}`)} />
            </View>
          )}
          ListHeaderComponent={
            list.error ? (
              <Text variant="bodySmall" style={styles.staleError}>
                Showing saved results — {list.error}
              </Text>
            ) : null
          }
          ListEmptyComponent={
            filtered ? (
              <EmptyState
                icon="magnify-close"
                title="No matches"
                body={`Nothing matches${debounced ? ` “${debounced}”` : ''}${filter !== 'ALL' ? ` in ${filter.toLowerCase()}` : ''}.`}
                action={
                  <Button
                    mode="outlined"
                    onPress={() => {
                      setQuery('');
                      setFilter('ALL');
                    }}
                  >
                    Clear filters
                  </Button>
                }
              />
            ) : (
              <EmptyState
                icon="receipt-text-outline"
                title="No transactions yet"
                body="Everything you record by hand shows up here, newest first."
                action={
                  <Button mode="contained" icon="plus" onPress={() => router.push('/transaction/new')}>
                    Add transaction
                  </Button>
                }
              />
            )
          }
        />
      )}

      <FAB icon="plus" style={styles.fab} color="#FFFFFF" onPress={() => router.push('/transaction/new')} accessibilityLabel="Add transaction" />
    </SafeAreaView>
  );
}

function groupByDay(items: Transaction[]) {
  const groups: { title: string; data: Transaction[] }[] = [];
  let current: string | null = null;
  for (const t of items) {
    if (t.date !== current) {
      current = t.date;
      groups.push({ title: formatDay(t.date), data: [] });
    }
    groups[groups.length - 1].data.push(t);
  }
  return groups;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.cream },
  header: { paddingHorizontal: 16, paddingTop: 8, gap: 12, paddingBottom: 8, maxWidth: 720, width: '100%', alignSelf: 'center' },
  title: { color: palette.ink, fontWeight: '700', paddingHorizontal: 4 },
  search: { backgroundColor: palette.paper, borderWidth: 1, borderColor: palette.line },
  searchInput: { minHeight: 0 },
  list: { paddingHorizontal: 16, paddingBottom: 112, maxWidth: 720, width: '100%', alignSelf: 'center', flexGrow: 1 },
  section: { color: palette.muted, marginTop: 16, marginBottom: 6, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 0.8 },
  rowWrap: { backgroundColor: palette.paper, borderLeftWidth: 1, borderRightWidth: 1, borderColor: palette.line },
  first: { borderTopWidth: 1, borderTopLeftRadius: 12, borderTopRightRadius: 12 },
  last: { borderBottomWidth: 1, borderBottomLeftRadius: 12, borderBottomRightRadius: 12 },
  staleError: { color: palette.danger, marginTop: 8 },
  fab: { position: 'absolute', right: 16, bottom: 16, backgroundColor: palette.green },
});

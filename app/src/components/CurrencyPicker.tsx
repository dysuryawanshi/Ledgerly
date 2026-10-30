import { useMemo, useState } from 'react';
import { FlatList, StyleSheet } from 'react-native';
import { Button, Dialog, List, Portal, RadioButton, Searchbar, Text } from 'react-native-paper';
import { CURRENCIES } from '../lib/currencies';
import { palette } from '../lib/theme';

export function CurrencyPicker({
  visible,
  value,
  onSelect,
  onDismiss,
}: {
  visible: boolean;
  value: string;
  onSelect: (code: string) => void;
  onDismiss: () => void;
}) {
  const [query, setQuery] = useState('');
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CURRENCIES;
    return CURRENCIES.filter((c) => c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q));
  }, [query]);

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss} style={styles.dialog}>
        <Dialog.Title>Currency</Dialog.Title>
        <Dialog.Content>
          <Searchbar placeholder="Search code or name" value={query} onChangeText={setQuery} style={styles.search} />
        </Dialog.Content>
        <Dialog.ScrollArea style={styles.area}>
          <FlatList
            data={results}
            keyExtractor={(c) => c.code}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <Text variant="bodyMedium" style={styles.empty}>
                No currency matches “{query}”.
              </Text>
            }
            renderItem={({ item }) => (
              <List.Item
                title={`${item.code} · ${item.name}`}
                onPress={() => {
                  onSelect(item.code);
                  setQuery('');
                }}
                right={() => (
                  <RadioButton
                    value={item.code}
                    status={item.code === value ? 'checked' : 'unchecked'}
                    onPress={() => onSelect(item.code)}
                  />
                )}
              />
            )}
          />
        </Dialog.ScrollArea>
        <Dialog.Actions>
          <Button onPress={onDismiss}>Close</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  dialog: { maxHeight: '85%' },
  search: { backgroundColor: palette.sand },
  area: { height: 360, paddingHorizontal: 0 },
  empty: { textAlign: 'center', padding: 24, color: palette.muted },
});

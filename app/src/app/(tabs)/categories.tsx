import { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import {
  Avatar,
  Button,
  Card,
  Dialog,
  Divider,
  FAB,
  HelperText,
  IconButton,
  List,
  Portal,
  SegmentedButtons,
  Text,
  TextInput,
  TouchableRipple,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState, ErrorState, LoadingState } from '../../components/StateViews';
import { api, ApiError, type Category, type TxType } from '../../lib/api';
import { palette } from '../../lib/theme';
import { useToast } from '../../lib/toast';
import { useResource } from '../../lib/useResource';

const ICONS = [
  'shape-outline', 'cart-outline', 'home-outline', 'silverware-fork-knife', 'train-car', 'flash-outline',
  'heart-pulse', 'movie-open-outline', 'briefcase-outline', 'laptop', 'gift-outline', 'airplane',
  'school-outline', 'paw', 'dumbbell', 'cellphone',
];
const COLORS = ['#1F4D3A', '#2E7D5B', '#5C8A4D', '#B5651D', '#7A4E2D', '#C2410C', '#4B6584', '#A16207', '#9F1239', '#6D28D9'];

export default function Categories() {
  const toast = useToast();
  const categories = useResource(() => api.listCategories().then((r) => r.categories), []);
  const [creating, setCreating] = useState(false);
  const [toDelete, setToDelete] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);

  const groups = useMemo(() => {
    const all = categories.data ?? [];
    return [
      { type: 'EXPENSE' as const, title: 'Spending', items: all.filter((c) => c.type === 'EXPENSE') },
      { type: 'INCOME' as const, title: 'Income', items: all.filter((c) => c.type === 'INCOME') },
    ];
  }, [categories.data]);

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await api.deleteCategory(toDelete.id);
      toast(`Deleted “${toDelete.name}”`);
      setToDelete(null);
      await categories.refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not delete category.', 'error');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <Text variant="headlineSmall" style={styles.title}>
          Categories
        </Text>
        <Text variant="bodyMedium" style={styles.muted}>
          Group your transactions so you can see where money goes.
        </Text>
      </View>

      {categories.loading && !categories.data ? (
        <LoadingState label="Loading categories…" />
      ) : categories.error && !categories.data ? (
        <ErrorState message={categories.error} onRetry={categories.retry} />
      ) : (categories.data ?? []).length === 0 ? (
        <EmptyState
          icon="shape-plus"
          title="No categories yet"
          body="Create categories like Groceries or Salary to organise your transactions."
          action={
            <Button mode="contained" icon="plus" onPress={() => setCreating(true)}>
              Create category
            </Button>
          }
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={categories.refreshing} onRefresh={categories.refresh} tintColor={palette.green} />}
        >
          {groups.map((g) => (
            <Card key={g.type} mode="outlined" style={styles.card}>
              <Card.Title title={g.title} subtitle={`${g.items.length} ${g.items.length === 1 ? 'category' : 'categories'}`} />
              {g.items.length === 0 ? (
                <Card.Content>
                  <Text variant="bodyMedium" style={styles.muted}>
                    No {g.title.toLowerCase()} categories. Tap “New” to add one.
                  </Text>
                </Card.Content>
              ) : (
                g.items.map((c, i) => (
                  <View key={c.id}>
                    {i > 0 ? <Divider /> : null}
                    <List.Item
                      title={c.name}
                      description={`${c.transactionCount ?? 0} ${c.transactionCount === 1 ? 'transaction' : 'transactions'}`}
                      left={() => (
                        <Avatar.Icon size={40} icon={c.icon} color={c.color} style={[styles.avatar, { backgroundColor: `${c.color}1F` }]} />
                      )}
                      right={() => (
                        <IconButton icon="trash-can-outline" onPress={() => setToDelete(c)} accessibilityLabel={`Delete ${c.name}`} />
                      )}
                    />
                  </View>
                ))
              )}
            </Card>
          ))}
        </ScrollView>
      )}

      <FAB icon="plus" label="New" style={styles.fab} color="#FFFFFF" onPress={() => setCreating(true)} />

      <CreateCategoryDialog
        visible={creating}
        onDismiss={() => setCreating(false)}
        onCreated={async (c) => {
          setCreating(false);
          toast(`Created “${c.name}”`);
          await categories.refresh();
        }}
      />

      <Portal>
        <Dialog visible={!!toDelete} onDismiss={() => !deleting && setToDelete(null)}>
          <Dialog.Icon icon="trash-can-outline" />
          <Dialog.Title style={styles.center}>Delete “{toDelete?.name}”?</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              {toDelete?.transactionCount
                ? `${toDelete.transactionCount} transactions will be kept and marked as uncategorised.`
                : 'This category has no transactions.'}
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setToDelete(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button onPress={confirmDelete} loading={deleting} disabled={deleting} textColor={palette.danger}>
              Delete
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SafeAreaView>
  );
}

function CreateCategoryDialog({
  visible,
  onDismiss,
  onCreated,
}: {
  visible: boolean;
  onDismiss: () => void;
  onCreated: (c: Category) => void;
}) {
  const [name, setName] = useState('');
  const [type, setType] = useState<TxType>('EXPENSE');
  const [icon, setIcon] = useState(ICONS[0]);
  const [color, setColor] = useState(COLORS[0]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function reset() {
    setName('');
    setType('EXPENSE');
    setIcon(ICONS[0]);
    setColor(COLORS[0]);
    setError(null);
  }

  async function save() {
    if (!name.trim()) {
      setError('Enter a name');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const { category } = await api.createCategory({ name: name.trim(), type, icon, color });
      reset();
      onCreated(category);
    } catch (e) {
      setError(e instanceof ApiError ? (e.fields.name ?? e.message) : 'Could not create category.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={() => !saving && onDismiss()} style={styles.dialog}>
        <Dialog.Title>New category</Dialog.Title>
        <Dialog.ScrollArea style={styles.dialogArea}>
          <ScrollView contentContainerStyle={styles.dialogContent} keyboardShouldPersistTaps="handled">
            <SegmentedButtons
              value={type}
              onValueChange={(v) => setType(v as TxType)}
              buttons={[
                { value: 'EXPENSE', label: 'Spending' },
                { value: 'INCOME', label: 'Income' },
              ]}
            />
            <TextInput mode="outlined" label="Name" value={name} onChangeText={setName} maxLength={40} error={!!error} style={styles.gapTop} />
            <HelperText type="error" visible={!!error}>
              {error}
            </HelperText>
            <Text variant="labelLarge" style={styles.muted}>
              Icon
            </Text>
            <View style={styles.grid}>
              {ICONS.map((i) => (
                <IconButton
                  key={i}
                  icon={i}
                  mode={i === icon ? 'contained' : 'outlined'}
                  selected={i === icon}
                  iconColor={i === icon ? '#FFFFFF' : color}
                  containerColor={i === icon ? color : undefined}
                  onPress={() => setIcon(i)}
                  accessibilityLabel={i}
                />
              ))}
            </View>
            <Text variant="labelLarge" style={[styles.muted, styles.gapTop]}>
              Colour
            </Text>
            <View style={styles.grid}>
              {COLORS.map((c) => (
                <TouchableRipple
                  key={c}
                  onPress={() => setColor(c)}
                  style={[styles.swatch, { backgroundColor: c }, c === color && styles.swatchActive]}
                  accessibilityLabel={`Colour ${c}`}
                  accessibilityState={{ selected: c === color }}
                  borderless
                >
                  <View />
                </TouchableRipple>
              ))}
            </View>
          </ScrollView>
        </Dialog.ScrollArea>
        <Dialog.Actions>
          <Button onPress={onDismiss} disabled={saving}>
            Cancel
          </Button>
          <Button mode="contained" onPress={save} loading={saving} disabled={saving}>
            Create
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.cream },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8, gap: 4, maxWidth: 720, width: '100%', alignSelf: 'center' },
  title: { color: palette.ink, fontWeight: '700' },
  muted: { color: palette.muted },
  content: { padding: 16, gap: 16, paddingBottom: 112, maxWidth: 720, width: '100%', alignSelf: 'center' },
  card: { backgroundColor: palette.paper, borderColor: palette.line },
  avatar: { alignSelf: 'center', marginLeft: 8 },
  fab: { position: 'absolute', right: 16, bottom: 16, backgroundColor: palette.green },
  center: { textAlign: 'center' },
  dialog: { maxHeight: '90%' },
  dialogArea: { paddingHorizontal: 0, maxHeight: 460 },
  dialogContent: { padding: 20 },
  gapTop: { marginTop: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 8 },
  swatch: { width: 36, height: 36, borderRadius: 18, margin: 4 },
  swatchActive: { borderWidth: 3, borderColor: palette.ink },
});

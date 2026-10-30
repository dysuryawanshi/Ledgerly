import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import {
  ActivityIndicator,
  Button,
  Chip,
  HelperText,
  IconButton,
  SegmentedButtons,
  Text,
  TextInput,
} from 'react-native-paper';
import { api, ApiError, type Transaction, type TransactionInput, type TxType } from '../lib/api';
import { currencyInfo } from '../lib/currencies';
import { formatDay, isValidDate, shiftDate, todayString } from '../lib/format';
import { palette } from '../lib/theme';
import { useResource } from '../lib/useResource';
import { CurrencyPicker } from './CurrencyPicker';

type Errors = Partial<Record<'amount' | 'currency' | 'categoryId' | 'note' | 'date' | 'form', string>>;

export function TransactionForm({
  initial,
  defaultCurrency,
  submitLabel,
  onSubmit,
  footer,
}: {
  initial?: Transaction;
  defaultCurrency: string;
  submitLabel: string;
  onSubmit: (input: TransactionInput) => Promise<void>;
  footer?: React.ReactNode;
}) {
  const [type, setType] = useState<TxType>(initial?.type ?? 'EXPENSE');
  const [amount, setAmount] = useState(initial?.amount ? trimZeros(initial.amount) : '');
  const [currency, setCurrency] = useState(initial?.currency ?? defaultCurrency);
  const [categoryId, setCategoryId] = useState<string | null>(initial?.category?.id ?? null);
  const [note, setNote] = useState(initial?.note ?? '');
  const [date, setDate] = useState(initial?.date ?? todayString());
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const [picker, setPicker] = useState(false);

  const categories = useResource(() => api.listCategories().then((r) => r.categories), []);
  const visibleCategories = (categories.data ?? []).filter((c) => c.type === type);
  const decimals = currencyInfo(currency).decimals;

  function validate(): Errors {
    const e: Errors = {};
    const value = amount.trim().replace(',', '.');
    const pattern = decimals === 0 ? /^\d+$/ : new RegExp(`^\\d+(\\.\\d{1,${decimals}})?$`);
    if (!value) e.amount = 'Enter an amount';
    else if (!pattern.test(value))
      e.amount = decimals === 0 ? `${currency} amounts have no decimals` : `Use up to ${decimals} decimals`;
    else if (Number(value) <= 0) e.amount = 'Amount must be greater than zero';
    if (!isValidDate(date)) e.date = 'Use a real date in the format YYYY-MM-DD';
    if (note.length > 280) e.note = 'Keep notes under 280 characters';
    return e;
  }

  async function submit() {
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    try {
      await onSubmit({
        type,
        amount: amount.trim().replace(',', '.'),
        currency,
        categoryId,
        note: note.trim(),
        date,
      });
    } catch (err) {
      if (err instanceof ApiError) setErrors({ ...err.fields, form: err.message } as Errors);
      else setErrors({ form: 'Something went wrong. Please try again.' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <SegmentedButtons
          value={type}
          onValueChange={(v) => {
            setType(v as TxType);
            setCategoryId(null);
          }}
          buttons={[
            { value: 'EXPENSE', label: 'Expense', icon: 'arrow-up-right' },
            { value: 'INCOME', label: 'Income', icon: 'arrow-down-left' },
          ]}
        />

        <View style={styles.amountRow}>
          <Button
            mode="outlined"
            onPress={() => setPicker(true)}
            style={styles.currencyButton}
            contentStyle={styles.currencyButtonContent}
            icon="chevron-down"
            accessibilityLabel={`Currency ${currency}. Change currency`}
          >
            {currency}
          </Button>
          <TextInput
            mode="outlined"
            label="Amount"
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder={decimals === 0 ? '0' : `0.${'0'.repeat(decimals)}`}
            error={!!errors.amount}
            style={[styles.flex, styles.amountInput]}
            right={<TextInput.Affix text={currency} />}
          />
        </View>
        <HelperText type="error" visible={!!errors.amount || !!errors.currency}>
          {errors.amount ?? errors.currency}
        </HelperText>

        <Text variant="titleSmall" style={styles.label}>
          Category
        </Text>
        {categories.loading ? (
          <View style={styles.inline}>
            <ActivityIndicator size="small" />
            <Text variant="bodySmall" style={styles.muted}>
              Loading categories…
            </Text>
          </View>
        ) : categories.error ? (
          <View style={styles.inline}>
            <Text variant="bodySmall" style={{ color: palette.danger }}>
              Couldn't load categories.
            </Text>
            <Button compact onPress={categories.retry}>
              Retry
            </Button>
          </View>
        ) : (
          <View style={styles.chips}>
            <Chip selected={categoryId === null} onPress={() => setCategoryId(null)} icon="minus-circle-outline">
              None
            </Chip>
            {visibleCategories.map((c) => (
              <Chip
                key={c.id}
                icon={c.icon}
                selected={categoryId === c.id}
                showSelectedOverlay
                onPress={() => setCategoryId(c.id)}
              >
                {c.name}
              </Chip>
            ))}
            {visibleCategories.length === 0 ? (
              <Text variant="bodySmall" style={styles.muted}>
                No {type === 'INCOME' ? 'income' : 'expense'} categories yet. Add some in the Categories tab.
              </Text>
            ) : null}
          </View>
        )}
        <HelperText type="error" visible={!!errors.categoryId}>
          {errors.categoryId}
        </HelperText>

        <TextInput
          mode="outlined"
          label="Note"
          value={note}
          onChangeText={setNote}
          placeholder="What was it for?"
          maxLength={280}
          error={!!errors.note}
        />
        <HelperText type={errors.note ? 'error' : 'info'} visible>
          {errors.note ?? `${note.length}/280`}
        </HelperText>

        <View style={styles.amountRow}>
          <IconButton icon="chevron-left" mode="outlined" onPress={() => isValidDate(date) && setDate(shiftDate(date, -1))} accessibilityLabel="Previous day" />
          <TextInput
            mode="outlined"
            label="Date"
            value={date}
            onChangeText={setDate}
            placeholder="YYYY-MM-DD"
            error={!!errors.date}
            style={styles.flex}
            right={<TextInput.Icon icon="calendar-today" onPress={() => setDate(todayString())} accessibilityLabel="Today" />}
          />
          <IconButton icon="chevron-right" mode="outlined" onPress={() => isValidDate(date) && setDate(shiftDate(date, 1))} accessibilityLabel="Next day" />
        </View>
        <HelperText type={errors.date ? 'error' : 'info'} visible>
          {errors.date ?? (isValidDate(date) ? formatDay(date) : 'YYYY-MM-DD')}
        </HelperText>

        {errors.form ? (
          <HelperText type="error" visible style={styles.formError}>
            {errors.form}
          </HelperText>
        ) : null}

        <Button mode="contained" onPress={submit} loading={saving} disabled={saving} style={styles.submit} contentStyle={styles.submitContent}>
          {submitLabel}
        </Button>
        {footer}
      </ScrollView>

      <CurrencyPicker
        visible={picker}
        value={currency}
        onDismiss={() => setPicker(false)}
        onSelect={(code) => {
          setCurrency(code);
          setPicker(false);
        }}
      />
    </KeyboardAvoidingView>
  );
}

function trimZeros(amount: string): string {
  return amount.includes('.') ? amount.replace(/\.?0+$/, '') : amount;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 20, gap: 4, paddingBottom: 48, maxWidth: 640, width: '100%', alignSelf: 'center' },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16 },
  currencyButton: { borderRadius: 4, height: 56, justifyContent: 'center' },
  currencyButtonContent: { flexDirection: 'row-reverse', height: 56 },
  amountInput: { fontSize: 22 },
  label: { marginTop: 8, marginBottom: 8, color: palette.muted },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 40 },
  muted: { color: palette.muted },
  formError: { fontSize: 14 },
  submit: { marginTop: 8 },
  submitContent: { height: 52 },
});

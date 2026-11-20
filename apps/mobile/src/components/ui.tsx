import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';

export const colors = {
  text: '#1f2933',
  muted: '#52606d',
  border: '#cbd2d9',
  primary: '#2f6f4f',
  primaryText: '#ffffff',
  error: '#b42318',
  errorBg: '#fef3f2',
  surface: '#f5f7fa',
  background: '#ffffff',
};

type FieldProps = TextInputProps & {
  label: string;
  error?: string;
  optional?: boolean;
};

export function Field({ label, error, optional, style, ...inputProps }: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>
        {label}
        {optional ? <Text style={styles.optional}> (isteğe bağlı)</Text> : null}
      </Text>
      <TextInput
        placeholderTextColor={colors.muted}
        style={[styles.input, error ? styles.inputError : null, style]}
        accessibilityLabel={label}
        {...inputProps}
      />
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

type ButtonProps = {
  title: string;
  onPress: () => void;
  loading?: boolean;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
};

export function Button({ title, onPress, loading, variant = 'primary', disabled }: ButtonProps) {
  const isPrimary = variant === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={loading || disabled}
      style={({ pressed }) => [
        styles.button,
        isPrimary ? styles.buttonPrimary : styles.buttonSecondary,
        (pressed || loading || disabled) && { opacity: 0.7 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? colors.primaryText : colors.primary} />
      ) : (
        <Text style={isPrimary ? styles.buttonPrimaryText : styles.buttonSecondaryText}>{title}</Text>
      )}
    </Pressable>
  );
}

type Option<T extends string> = { value: T; label: string };

export function Choice<T extends string>({
  label,
  options,
  value,
  onChange,
  error,
  optional,
}: {
  label: string;
  options: Option<T>[];
  value: T | null;
  onChange: (value: T | null) => void;
  error?: string;
  optional?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>
        {label}
        {optional ? <Text style={styles.optional}> (isteğe bağlı)</Text> : null}
      </Text>
      <View style={styles.choiceRow}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              // İsteğe bağlı alanlarda seçili seçeneğe tekrar dokunmak seçimi kaldırır.
              onPress={() => onChange(selected && optional ? null : option.value)}
              style={[styles.choice, selected && styles.choiceSelected]}
            >
              <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

export function Checkbox({
  checked,
  onChange,
  children,
  error,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  children: ReactNode;
  error?: string;
}) {
  return (
    <View style={styles.field}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        onPress={() => onChange(!checked)}
        style={styles.checkboxRow}
      >
        <View style={[styles.checkbox, checked && styles.checkboxChecked, error ? styles.inputError : null]}>
          {checked ? <Text style={styles.checkboxMark}>✓</Text> : null}
        </View>
        <View style={{ flex: 1 }}>{children}</View>
      </Pressable>
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

export function Stepper({
  label,
  value,
  min,
  max,
  onChange,
  suffix,
  a11yName,
}: {
  label: string;
  /** Ekran okuyucu için ayırt edici ad (ör. ürün adı); verilmezse label kullanılır */
  a11yName?: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  suffix?: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.stepperRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${a11yName ?? label} azalt`}
          onPress={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          style={[styles.stepperButton, value <= min && { opacity: 0.4 }]}
        >
          <Text style={styles.stepperButtonText}>−</Text>
        </Pressable>
        <Text style={styles.stepperValue} accessibilityLabel={`${a11yName ?? label}: ${value}`}>
          {value}
          {suffix ? ` ${suffix}` : ''}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${a11yName ?? label} artır`}
          onPress={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          style={[styles.stepperButton, value >= max && { opacity: 0.4 }]}
        >
          <Text style={styles.stepperButtonText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function LinkText({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="link" onPress={onPress} style={{ paddingVertical: 8 }}>
      <Text style={styles.link}>{title}</Text>
    </Pressable>
  );
}

export function InfoBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <View style={styles.info}>
      <Text style={{ color: colors.text }}>{message}</Text>
    </View>
  );
}

export function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <View style={styles.banner} accessibilityRole="alert">
      <Text style={styles.bannerText}>{message}</Text>
    </View>
  );
}

export function Centered({ children }: { children: ReactNode }) {
  return <View style={styles.centered}>{children}</View>;
}

export const styles = StyleSheet.create({
  screen: { padding: 20, gap: 4, backgroundColor: colors.background },
  title: { fontSize: 24, fontWeight: '600', color: colors.text, marginBottom: 8 },
  muted: { color: colors.muted },
  field: { marginBottom: 12 },
  label: { fontSize: 14, fontWeight: '500', color: colors.text, marginBottom: 4 },
  optional: { fontWeight: '400', color: colors.muted },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.background,
  },
  inputError: { borderColor: colors.error },
  fieldError: { color: colors.error, fontSize: 13, marginTop: 4 },
  button: {
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonPrimary: { backgroundColor: colors.primary },
  buttonSecondary: { borderWidth: 1, borderColor: colors.primary },
  buttonPrimaryText: { color: colors.primaryText, fontSize: 16, fontWeight: '600' },
  buttonSecondaryText: { color: colors.primary, fontSize: 16, fontWeight: '600' },
  choiceRow: { flexDirection: 'row', gap: 8 },
  choice: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  choiceSelected: { borderColor: colors.primary, backgroundColor: '#e3f1ea' },
  choiceText: { fontSize: 16, color: colors.text },
  choiceTextSelected: { color: colors.primary, fontWeight: '600' },
  banner: {
    backgroundColor: colors.errorBg,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  bannerText: { color: colors.error },
  checkboxRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkboxMark: { color: colors.primaryText, fontWeight: '700' },
  link: { color: colors.primary, fontWeight: '600', textAlign: 'center' },
  info: { backgroundColor: '#e3f1ea', borderRadius: 8, padding: 12, marginBottom: 12 },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  stepperButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperButtonText: { fontSize: 22, color: colors.primary, fontWeight: '600' },
  stepperValue: { fontSize: 18, fontWeight: '600', color: colors.text, minWidth: 80, textAlign: 'center' },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 16,
    marginBottom: 10,
    backgroundColor: colors.surface,
  },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: colors.text, marginTop: 20, marginBottom: 8 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
});

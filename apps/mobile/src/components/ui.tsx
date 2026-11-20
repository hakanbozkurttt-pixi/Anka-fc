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
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
});

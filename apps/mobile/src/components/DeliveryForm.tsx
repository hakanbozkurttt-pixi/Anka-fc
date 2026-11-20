import { Text } from 'react-native';

import { DELIVERY_LABEL, formatTL, type DeliveryType } from '../lib/orderCalc';
import { Choice, Field, styles } from './ui';

export type DeliveryFormValue = {
  type: DeliveryType | null;
  address: string;
  date: string; // GG.AA.YYYY
  time: string; // SS:DD
};

export type DeliveryFormErrors = Partial<Record<'type' | 'address' | 'date' | 'time', string>>;

type Props = {
  value: DeliveryFormValue;
  onChange: (v: DeliveryFormValue) => void;
  errors: DeliveryFormErrors;
  shippingFee: number;
};

export function DeliveryForm({ value, onChange, errors, shippingFee }: Props) {
  const set = (patch: Partial<DeliveryFormValue>) => onChange({ ...value, ...patch });
  return (
    <>
      <Choice
        label="Teslim şekli"
        options={[
          { value: 'pickup', label: 'Hastaneden alırım' },
          { value: 'address', label: 'Adrese teslim' },
        ]}
        value={value.type}
        onChange={(t) => set({ type: t })}
        error={errors.type}
      />
      {value.type === 'pickup' ? (
        <Text style={[styles.muted, { marginBottom: 12 }]}>
          {DELIVERY_LABEL.pickup}: kargo ücreti yok. Sipariş onaylandıktan sonra hastaneden dilediğiniz zaman
          alabilirsiniz.
        </Text>
      ) : null}
      {value.type === 'address' ? (
        <>
          <Text style={[styles.muted, { marginBottom: 12 }]}>
            {DELIVERY_LABEL.address}: {formatTL(shippingFee)} kargo ücreti eklenir.
          </Text>
          <Field
            label="Teslimat adresi"
            value={value.address}
            onChangeText={(t) => set({ address: t })}
            error={errors.address}
            multiline
            numberOfLines={3}
            style={{ minHeight: 80, textAlignVertical: 'top' }}
          />
          <Field
            label="Teslimat tarihi"
            value={value.date}
            onChangeText={(t) => set({ date: t })}
            error={errors.date}
            placeholder="GG.AA.YYYY"
            keyboardType="numbers-and-punctuation"
            maxLength={10}
          />
          <Field
            label="Teslimat saati"
            value={value.time}
            onChangeText={(t) => set({ time: t })}
            error={errors.time}
            placeholder="SS:DD (ör. 14:30)"
            keyboardType="numbers-and-punctuation"
            maxLength={5}
          />
        </>
      ) : null}
    </>
  );
}

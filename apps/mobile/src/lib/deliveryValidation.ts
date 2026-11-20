import type { DeliveryFormErrors, DeliveryFormValue } from '../components/DeliveryForm';
import { deliveryTimeError, nowLocalIso, parseTime } from './orderCalc';
import type { DeliveryInput } from './orders';
import { parseTurkishDate } from './validation';

/** Teslimat formunu denetler; geçerliyse sunucuya gönderilecek bilgiyi döndürür. */
export function validateDelivery(v: DeliveryFormValue): { errors: DeliveryFormErrors; input: DeliveryInput | null } {
  const errors: DeliveryFormErrors = {};
  if (!v.type) {
    errors.type = 'Teslim şeklini seçin.';
    return { errors, input: null };
  }
  if (v.type === 'pickup') return { errors, input: { delivery_type: 'pickup' } };

  if (v.address.trim().length < 5) errors.address = 'Teslimat adresini girin.';
  const date = parseTurkishDate(v.date);
  const time = parseTime(v.time);
  if (!date) errors.date = 'Tarihi GG.AA.YYYY biçiminde girin.';
  if (!time) errors.time = 'Saati SS:DD biçiminde girin (ör. 14:30).';
  if (date && time) {
    const e = deliveryTimeError(date, time, nowLocalIso());
    if (e) errors.date = e;
  }
  if (Object.keys(errors).length > 0 || !date || !time) return { errors, input: null };
  return {
    errors,
    input: { delivery_type: 'address', delivery_address: v.address.trim(), delivery_date: date, delivery_time: time },
  };
}

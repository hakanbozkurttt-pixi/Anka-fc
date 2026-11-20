import { Text } from 'react-native';

import { STATUS_LABEL, type OrderStatus } from '../lib/orderCalc';

const COLORS: Record<OrderStatus, { bg: string; fg: string }> = {
  pending: { bg: '#fff3c4', fg: '#8a5a00' },
  approved: { bg: '#e3f1ea', fg: '#1f6f3b' },
  delivered: { bg: '#e4e7eb', fg: '#1f2933' },
  cancelled: { bg: '#fde2e1', fg: '#b42318' },
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const c = COLORS[status];
  return (
    <Text
      style={{
        backgroundColor: c.bg,
        color: c.fg,
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 999,
        overflow: 'hidden',
        fontSize: 13,
        fontWeight: '600',
      }}
    >
      {STATUS_LABEL[status]}
    </Text>
  );
}

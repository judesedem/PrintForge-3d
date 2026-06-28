import { View, StyleSheet } from 'react-native';
import { colors } from '../theme';
import { PrinterStatus } from '../data/mockData';

const statusColor: Record<PrinterStatus, string> = {
  AVAILABLE: colors.printerAvailable,
  BUSY: colors.printerBusy,
  OFFLINE: colors.printerOffline,
  MAINTENANCE: colors.printerMaintenance,
};

export default function PrinterDot({ status }: { status: PrinterStatus }) {
  return <View style={[styles.dot, { backgroundColor: statusColor[status] }]} />;
}

const styles = StyleSheet.create({
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
});

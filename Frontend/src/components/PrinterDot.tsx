import { View, StyleSheet } from 'react-native';
import { useTheme } from '../ThemeContext';
import { PrinterStatus } from '../data/mockData';

export default function PrinterDot({ status }: { status: PrinterStatus }) {
  const { colors } = useTheme();
  const statusColor: Record<PrinterStatus, string> = {
    AVAILABLE: colors.printerAvailable,
    BUSY: colors.printerBusy,
    OFFLINE: colors.printerOffline,
    MAINTENANCE: colors.printerMaintenance,
  };

  return (
    <View style={[styles.ring, { borderColor: `${statusColor[status]}33` }]}>
      <View style={[styles.dot, { backgroundColor: statusColor[status] }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  ring: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
});

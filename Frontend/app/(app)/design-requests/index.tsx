import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSession } from '@/SessionContext';
import { useToast } from '@/ToastContext';
import { useTheme } from '@/ThemeContext';
import { Colors, designTokens } from '@/theme';
import { fetchMyRequests, DesignRequest } from '@/api/design-requests';
import { initiatePayment } from '@/api/payments';
import { Plus, CreditCard, Download } from 'lucide-react-native';

export default function MyDesignRequestsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const s = makeStyles(colors);
  const { token, appUser } = useSession();
  const { showToast } = useToast();

  const [requests, setRequests] = useState<DesignRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      loadRequests();
    }
  }, [token]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const data = await fetchMyRequests(token!);
      setRequests(data);
    } catch (error) {
      showToast("Failed to load requests");
    } finally {
      setLoading(false);
    }
  };

  const handlePay = async (req: DesignRequest) => {
    try {
      const payment = await initiatePayment(token!, {
        requestId: req.id
      });
      // Note: we can redirect to the checkoutUrl
      // but Expo web handles it by opening the link
      if (payment.checkoutUrl) {
        window.location.href = payment.checkoutUrl;
      }
    } catch (err: any) {
      showToast(err.message || "Payment initiation failed");
    }
  };

  const renderItem = ({ item }: { item: DesignRequest }) => {
    return (
      <View style={s.card}>
        <View style={s.cardHeader}>
          <Text style={s.cardTitle}>{item.title}</Text>
          <View style={s.statusBadge}>
            <Text style={s.statusText}>{item.status}</Text>
          </View>
        </View>
        <Text style={s.cardDesc} numberOfLines={2}>{item.description}</Text>
        
        <View style={s.metaRow}>
          <Text style={s.metaText}>Budget: GH₵ {item.budget?.toFixed(2) || 'N/A'}</Text>
          {item.designerName && (
            <Text style={s.metaText}>Assigned: {item.designerName}</Text>
          )}
        </View>

        {item.status === 'FULFILLED' && (
          <TouchableOpacity style={s.payBtn} onPress={() => handlePay(item)}>
            <CreditCard size={18} color="#FFFFFF" />
            <Text style={s.payText}>Pay & Download</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={s.screen}>
      <View style={s.header}>
        <Text style={s.title}>My Requests</Text>
        <TouchableOpacity 
          style={s.createBtn}
          onPress={() => router.push('/(app)/design-requests/create')}
        >
          <Plus size={20} color="#FFFFFF" />
          <Text style={s.createText}>New Request</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
      ) : requests.length === 0 ? (
        <View style={s.emptyState}>
          <Text style={s.emptyText}>You haven't made any design requests yet.</Text>
        </View>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(r) => r.id}
          renderItem={renderItem}
          contentContainerStyle={s.list}
        />
      )}
    </View>
  );
}

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: designTokens.spacing.lg,
      borderBottomWidth: 1,
      borderColor: colors.border,
    },
    title: {
      fontSize: 24,
      fontFamily: designTokens.type.display,
      color: colors.foreground,
    },
    createBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primary,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: designTokens.radius.md,
      gap: 6,
    },
    createText: {
      color: '#FFFFFF',
      fontFamily: designTokens.type.heading,
      fontSize: 14,
    },
    list: {
      padding: designTokens.spacing.lg,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: designTokens.radius.lg,
      padding: designTokens.spacing.md,
      marginBottom: designTokens.spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    cardTitle: {
      fontFamily: designTokens.type.heading,
      fontSize: 16,
      color: colors.foreground,
      flex: 1,
      marginRight: 10,
    },
    statusBadge: {
      backgroundColor: colors.primary,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
    },
    statusText: {
      color: '#FFFFFF',
      fontSize: 10,
      fontFamily: designTokens.type.medium,
    },
    cardDesc: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.body,
      fontSize: 14,
      marginBottom: 12,
    },
    metaRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    metaText: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.medium,
      fontSize: 12,
    },
    payBtn: {
      backgroundColor: colors.primary,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10,
      borderRadius: designTokens.radius.md,
      gap: 8,
    },
    payText: {
      color: '#FFFFFF',
      fontFamily: designTokens.type.heading,
      fontSize: 14,
    },
    emptyState: {
      alignItems: 'center',
      marginTop: 60,
    },
    emptyText: {
      color: colors.mutedFg,
      fontFamily: designTokens.type.body,
      fontSize: 16,
    },
  });
}

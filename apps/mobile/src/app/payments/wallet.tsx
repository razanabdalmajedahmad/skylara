import React, { useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  RefreshControl,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useWallet } from '@/hooks/useWallet';
import { useTickets } from '@/hooks/useTickets';
import { useDropzoneStore } from '@/stores/dropzone';
import { SLCard, SLIcon, SLBadge, SLButton, SLEmptyState, SLSkeleton } from '@/components/ui';
import { SLProgressBar } from '@/components/ui';
import { colors, spacing, typography } from '@/theme';

export default function WalletScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { activeDz } = useDropzoneStore();
  const [refreshing, setRefreshing] = React.useState(false);

  const { data: wallet, isLoading: walletLoading, refetch: refetchWallet } = useWallet();
  const { data: tickets, refetch: refetchTickets } = useTickets();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetchWallet(), refetchTickets()]);
    } finally {
      setRefreshing(false);
    }
  }, [refetchWallet, refetchTickets]);

  const formatBalance = (cents: number, currency: string) => {
    const amount = (cents / 100).toFixed(2);
    const symbol = currency === 'AED' ? '\u062F.\u0625' : currency;
    return `${symbol} ${amount}`;
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + spacing[2],
          paddingHorizontal: spacing[6],
          paddingBottom: spacing[4],
          backgroundColor: colors.background,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Pressable onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <SLIcon name="chevron-left" size="lg" color={colors.text.primary} />
          </Pressable>
          <Text style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: colors.text.primary }}>
            Wallet
          </Text>
          <Pressable onPress={onRefresh} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <SLIcon name="refresh" size="md" color={colors.text.tertiary} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: spacing[12] }}
        showsVerticalScrollIndicator={false}
        {...(Platform.OS !== 'web'
          ? { refreshControl: <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand.primary} /> }
          : {})}
      >
        {/* Balance Hero */}
        <View style={{ paddingHorizontal: spacing[6], paddingTop: spacing[6], paddingBottom: spacing[4] }}>
          <View
            style={{
              backgroundColor: colors.sky[900],
              borderRadius: 16,
              padding: spacing[8],
              ...({ boxShadow: '0px 8px 24px rgba(14, 165, 233, 0.3)' } as any),
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginBottom: spacing[2] }}>
              <SLIcon name="wallet" size="sm" color="rgba(255,255,255,0.7)" />
              <Text style={{ fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.semibold, color: 'rgba(255,255,255,0.7)' }}>
                ACCOUNT BALANCE
              </Text>
            </View>
            {walletLoading ? (
              <SLSkeleton width={200} height={48} />
            ) : (
              <Text style={{ fontSize: 40, fontWeight: typography.fontWeight.bold, color: colors.text.inverse }}>
                {formatBalance(wallet?.balanceCents || 0, wallet?.currency || 'AED')}
              </Text>
            )}
            <Text style={{ fontSize: typography.fontSize.xs, color: 'rgba(255,255,255,0.6)', marginTop: spacing[2] }}>
              {wallet?.currency || 'AED'} {'\u2022'} Available to spend
            </Text>
          </View>
        </View>

        {/* Add Funds Button */}
        <View style={{ paddingHorizontal: spacing[6], paddingBottom: spacing[6] }}>
          <SLButton
            label="Add Funds"
            onPress={() => Alert.alert('Coming Soon', 'Top-up functionality will be available soon via Stripe.')}
            size="lg"
            fullWidth
            iconLeft="plus"
          />
        </View>

        {/* Jump Tickets */}
        <View style={{ paddingHorizontal: spacing[6], paddingBottom: spacing[6] }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing[4] }}>
            <Text style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.bold, color: colors.text.primary }}>
              JUMP TICKETS
            </Text>
            <Pressable onPress={() => refetchTickets()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <SLIcon name="refresh" size="sm" color={colors.text.tertiary} />
            </Pressable>
          </View>

          {tickets && tickets.length > 0 ? (
            <View style={{ gap: spacing[3] }}>
              {tickets.map((ticket: any) => {
                const remaining = ticket.remaining || 0;
                const total = ticket.total || 10;
                const used = total - remaining;
                const percentage = Math.round((remaining / total) * 100);

                return (
                  <SLCard key={ticket.id} padding="lg" shadow="sm">
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: spacing[3] }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.semibold, color: colors.text.primary }}>
                          {ticket.type === 'FULL_ALT_150' ? 'Full Altitude 150' : 'Full Altitude 260'}
                        </Text>
                        <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary, marginTop: 2 }}>
                          {ticket.packageType === 'PACK' ? 'pack of 10' : 'single ticket'}
                        </Text>
                      </View>
                      {ticket.packageType === 'PACK' && (
                        <SLBadge label="Buy 10 get 1 free" variant="warning" />
                      )}
                    </View>

                    <Text style={{ fontSize: typography.fontSize['2xl'], fontWeight: typography.fontWeight.bold, color: colors.text.primary, marginBottom: spacing[2] }}>
                      {remaining} <Text style={{ fontSize: typography.fontSize.sm, color: colors.text.tertiary }}>of {total}</Text>
                    </Text>

                    <SLProgressBar value={percentage} />

                    <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.secondary, marginTop: spacing[2] }}>
                      {used} used \u2022 {remaining} remaining
                    </Text>
                  </SLCard>
                );
              })}
            </View>
          ) : (
            <SLEmptyState
              icon="ticket"
              title="No Tickets Yet"
              description={`Buy jump tickets to start skydiving${activeDz?.name ? ` at ${activeDz.name}` : ''}`}
            />
          )}
        </View>

        {/* Buy Tickets */}
        <View style={{ paddingHorizontal: spacing[6], paddingBottom: spacing[6] }}>
          <SLButton
            label="Buy More Tickets"
            onPress={() => router.push('/payments/buy-tickets')}
            variant="outline"
            fullWidth
            iconLeft="ticket"
          />
        </View>

        {/* Quick Links */}
        <View style={{ paddingHorizontal: spacing[6], paddingBottom: spacing[6] }}>
          <Text style={{ fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.bold, color: colors.text.tertiary, marginBottom: spacing[3], letterSpacing: 1 }}>
            QUICK LINKS
          </Text>
          <View style={{ gap: spacing[2] }}>
            <Pressable
              onPress={() => router.push('/payments/history')}
              style={({ pressed }) => ({
                backgroundColor: pressed ? colors.gray[100] : colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 8,
                paddingHorizontal: spacing[4],
                paddingVertical: spacing[3],
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              })}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3] }}>
                <SLIcon name="history" size="md" color={colors.brand.primary} />
                <Text style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: colors.text.primary }}>
                  Transaction History
                </Text>
              </View>
              <SLIcon name="chevron-right" size="sm" color={colors.text.tertiary} />
            </Pressable>

            <Pressable
              onPress={() => router.push('/profile/edit')}
              style={({ pressed }) => ({
                backgroundColor: pressed ? colors.gray[100] : colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 8,
                paddingHorizontal: spacing[4],
                paddingVertical: spacing[3],
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              })}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3] }}>
                <SLIcon name="user" size="md" color={colors.brand.primary} />
                <Text style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: colors.text.primary }}>
                  Account Summary
                </Text>
              </View>
              <SLIcon name="chevron-right" size="sm" color={colors.text.tertiary} />
            </Pressable>
          </View>
        </View>

        {/* Payment Methods */}
        <View style={{ paddingHorizontal: spacing[6], paddingBottom: spacing[12] }}>
          <Text style={{ fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.bold, color: colors.text.tertiary, marginBottom: spacing[3], letterSpacing: 1 }}>
            PAYMENT METHODS
          </Text>
          <SLCard padding="md" shadow="sm">
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing[3] }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3] }}>
                <View style={{ width: 40, height: 28, borderRadius: 4, backgroundColor: colors.sky[100], alignItems: 'center', justifyContent: 'center' }}>
                  <SLIcon name="credit-card" size="sm" color={colors.brand.primary} />
                </View>
                <View>
                  <Text style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: colors.text.primary }}>
                    Visa ending in 4242
                  </Text>
                  <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary }}>
                    Expires 12/25
                  </Text>
                </View>
              </View>
              <SLIcon name="check-circle" size="md" color={colors.brand.success} />
            </View>
            <Pressable
              onPress={() => Alert.alert('Coming Soon', 'Payment method management will be available via Stripe.')}
              style={{ paddingVertical: spacing[2] }}
            >
              <Text style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: colors.brand.primary }}>
                + Add Payment Method
              </Text>
            </Pressable>
          </SLCard>
        </View>
      </ScrollView>
    </View>
  );
}

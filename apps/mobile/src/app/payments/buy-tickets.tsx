import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useDropzoneStore } from '@/stores/dropzone';
import { SLIcon, SLButton, SLCard, SLBadge } from '@/components/ui';
import { colors, spacing, typography } from '@/theme';

interface TicketType {
  id: string;
  name: string;
  type: 'FULL_ALT_150' | 'FULL_ALT_260';
  packageType: 'SINGLE' | 'PACK';
  pricePerTicketCents: number;
  quantity: number;
}

export default function BuyTicketsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { activeDz } = useDropzoneStore();
  const [tickets, setTickets] = useState<TicketType[]>([
    { id: 'fa150-single', name: 'Full Altitude 150', type: 'FULL_ALT_150', packageType: 'SINGLE', pricePerTicketCents: 15000, quantity: 0 },
    { id: 'fa150-pack', name: 'Full Altitude 150 (pack)', type: 'FULL_ALT_150', packageType: 'PACK', pricePerTicketCents: 15000, quantity: 0 },
    { id: 'fa260-single', name: 'Full Altitude 260', type: 'FULL_ALT_260', packageType: 'SINGLE', pricePerTicketCents: 25000, quantity: 0 },
    { id: 'fa260-pack', name: 'Full Altitude 260 (pack)', type: 'FULL_ALT_260', packageType: 'PACK', pricePerTicketCents: 25000, quantity: 0 },
  ]);

  const [showConfirmation, setShowConfirmation] = useState(false);
  const [selectedPaymentMethod] = useState('visa-4242');

  const totalItems = useMemo(() => tickets.reduce((sum, t) => sum + t.quantity, 0), [tickets]);
  const totalPrice = useMemo(() => tickets.reduce((sum, t) => sum + t.quantity * t.pricePerTicketCents, 0), [tickets]);
  const formatPrice = (cents: number) => (cents / 100).toFixed(2);

  const updateQuantity = (id: string, delta: number) => {
    setTickets((prev) => prev.map((t) => t.id === id ? { ...t, quantity: Math.max(0, t.quantity + delta) } : t));
  };

  const purchaseMutation = useMutation({
    mutationFn: async () => {
      if (!activeDz?.id) throw new Error('No active dropzone');
      for (const ticket of tickets) {
        if (ticket.quantity > 0) {
          await api.post('/jump-tickets/purchase', {
            ticketType: ticket.type, quantity: ticket.quantity, packageType: ticket.packageType, paymentMethodId: selectedPaymentMethod,
          });
        }
      }
    },
    onSuccess: () => {
      Alert.alert('Purchase Successful', `You have purchased ${totalItems} ticket${totalItems !== 1 ? 's' : ''}!`, [
        { text: 'Great!', onPress: () => { setTickets((prev) => prev.map((t) => ({ ...t, quantity: 0 }))); setShowConfirmation(false); } },
      ]);
    },
    onError: (error: any) => Alert.alert('Purchase Failed', error.response?.data?.message || 'Please try again'),
  });

  const handlePurchase = () => {
    if (totalItems === 0) { Alert.alert('No Tickets Selected', 'Please select at least one ticket to purchase'); return; }
    setShowConfirmation(true);
  };

  const currency = 'AED';
  const currencySymbol = currency === 'AED' ? 'د.إ' : currency;

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      {/* Header */}
      <View style={{ paddingTop: insets.top + spacing[2], paddingHorizontal: spacing[6], paddingBottom: spacing[4], backgroundColor: colors.background, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Pressable onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <SLIcon name="chevron-left" size="lg" color={colors.text.primary} />
          </Pressable>
          <Text style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: colors.text.primary }}>Buy Tickets</Text>
          <View style={{ width: 24 }} />
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
        <View style={{ paddingHorizontal: spacing[6], paddingVertical: spacing[6] }}>
          <Text style={{ fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.bold, color: colors.text.tertiary, marginBottom: spacing[4], letterSpacing: 1 }}>
            SELECT TICKETS
          </Text>

          <View style={{ gap: spacing[4] }}>
            {tickets.map((ticket) => (
              <SLCard key={ticket.id} padding="lg">
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: spacing[4] }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: typography.fontWeight.semibold, color: colors.text.primary, fontSize: typography.fontSize.base }}>{ticket.name}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginTop: spacing[2] }}>
                      <Text style={{ fontSize: 24, fontWeight: typography.fontWeight.bold, color: colors.brand.primary }}>
                        {currencySymbol} {formatPrice(ticket.pricePerTicketCents)}
                      </Text>
                      <Text style={{ fontSize: typography.fontSize.sm, color: colors.text.tertiary }}>per ticket</Text>
                    </View>
                  </View>
                  {ticket.packageType === 'PACK' && (
                    <SLBadge label="Buy 10 get 1" variant="warning" />
                  )}
                </View>

                {/* Quantity stepper */}
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.gray[100], borderRadius: 8, padding: spacing[2] }}>
                  <Pressable onPress={() => updateQuantity(ticket.id, -1)} style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 4 }}>
                    <SLIcon name="minus" size="sm" color={colors.text.secondary} />
                  </Pressable>
                  <View style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, color: colors.text.primary }}>{ticket.quantity}</Text>
                  </View>
                  <Pressable onPress={() => updateQuantity(ticket.id, 1)} style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 4 }}>
                    <SLIcon name="plus" size="sm" color={colors.text.secondary} />
                  </Pressable>
                </View>

                {ticket.quantity > 0 && (
                  <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.secondary, marginTop: spacing[2] }}>
                    Subtotal: {currencySymbol} {formatPrice(ticket.quantity * ticket.pricePerTicketCents)}
                  </Text>
                )}
              </SLCard>
            ))}
          </View>
        </View>

        {/* Payment */}
        <View style={{ paddingHorizontal: spacing[6], paddingVertical: spacing[6], borderTopWidth: 1, borderTopColor: colors.border }}>
          <Text style={{ fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.bold, color: colors.text.tertiary, marginBottom: spacing[4], letterSpacing: 1 }}>PAYMENT METHOD</Text>

          <SLCard padding="lg" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' } as any}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3] }}>
              <SLIcon name="credit-card" size="md" color={colors.brand.primary} />
              <View>
                <Text style={{ fontWeight: typography.fontWeight.semibold, color: colors.text.primary }}>Visa ending in 4242</Text>
                <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary }}>Expires 12/25</Text>
              </View>
            </View>
            <SLIcon name="check" size="sm" color={colors.brand.primary} />
          </SLCard>

          <Pressable onPress={() => Alert.alert('Coming Soon', 'Adding new payment methods will be available soon.')} style={{ marginTop: spacing[3], paddingVertical: spacing[2] }}>
            <Text style={{ color: colors.brand.primary, fontWeight: typography.fontWeight.semibold, fontSize: typography.fontSize.sm }}>
              + Add Payment Method
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Bottom */}
      <View style={{ paddingHorizontal: spacing[6], paddingVertical: spacing[4], paddingBottom: insets.bottom + spacing[4], backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.border }}>
        <View style={{ marginBottom: spacing[4] }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing[2] }}>
            <Text style={{ color: colors.text.secondary }}>Quantity:</Text>
            <Text style={{ fontWeight: typography.fontWeight.semibold, color: colors.text.primary }}>{totalItems}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: spacing[2], borderTopWidth: 1, borderTopColor: colors.border }}>
            <Text style={{ fontWeight: typography.fontWeight.bold, color: colors.text.primary }}>Total:</Text>
            <Text style={{ fontSize: 24, fontWeight: typography.fontWeight.bold, color: colors.brand.primary }}>{currencySymbol} {formatPrice(totalPrice)}</Text>
          </View>
        </View>
        <SLButton
          label={totalItems === 0 ? 'Select Tickets' : `Purchase for ${currencySymbol} ${formatPrice(totalPrice)}`}
          onPress={handlePurchase}
          fullWidth
          size="lg"
          disabled={totalItems === 0}
          loading={purchaseMutation.isPending}
          iconLeft="credit-card"
        />
      </View>

      {/* Confirmation Modal */}
      <Modal visible={showConfirmation} transparent animationType="fade" onRequestClose={() => setShowConfirmation(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' }} onPress={() => setShowConfirmation(false)}>
          <Pressable style={{ backgroundColor: colors.surface, borderRadius: 16, padding: spacing[6], marginHorizontal: spacing[6], width: '100%', maxWidth: 340 }} onPress={(e) => e.stopPropagation()}>
            <Text style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: colors.text.primary, marginBottom: spacing[2] }}>Confirm Purchase</Text>
            <Text style={{ color: colors.text.secondary, marginBottom: spacing[4] }}>
              You're about to purchase {totalItems} ticket{totalItems !== 1 ? 's' : ''} for {currencySymbol} {formatPrice(totalPrice)}.
            </Text>

            <View style={{ backgroundColor: colors.gray[50], borderRadius: 8, padding: spacing[4], marginBottom: spacing[6] }}>
              {tickets.map((t) => t.quantity > 0 ? (
                <View key={t.id} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing[2] }}>
                  <Text style={{ color: colors.text.secondary }}>{t.name}</Text>
                  <Text style={{ fontWeight: typography.fontWeight.semibold, color: colors.text.primary }}>x{t.quantity}</Text>
                </View>
              ) : null)}
            </View>

            <View style={{ flexDirection: 'row', gap: spacing[3] }}>
              <View style={{ flex: 1 }}>
                <SLButton label="Cancel" onPress={() => setShowConfirmation(false)} variant="ghost" fullWidth />
              </View>
              <View style={{ flex: 1 }}>
                <SLButton label="Confirm" onPress={() => { setShowConfirmation(false); purchaseMutation.mutateAsync(); }} fullWidth loading={purchaseMutation.isPending} />
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

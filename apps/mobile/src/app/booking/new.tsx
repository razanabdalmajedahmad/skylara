import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useCreateBooking, usePackages, useAvailableSlots } from '@/hooks/useBookings';
import { SLIcon, SLButton, SLCard, SLBadge } from '@/components/ui';
import { SLSkeleton } from '@/components/ui';
import type { IconName } from '@/components/ui/SLIcon';
import { colors, spacing, typography } from '@/theme';

const JUMP_TYPES: { value: string; label: string; description: string; icon: IconName; priceRange: string; requirements: string }[] = [
  { value: 'TANDEM', label: 'Tandem', description: 'Experience skydiving with a certified instructor', icon: 'users', priceRange: '$250-350', requirements: 'No experience needed' },
  { value: 'AFF', label: 'AFF Level 1', description: 'Accelerated Freefall progression training', icon: 'book-open', priceRange: '$350-450', requirements: 'AFF certification' },
  { value: 'FUN_JUMP', label: 'Fun Jump', description: 'Jump with other experienced skydivers', icon: 'wind', priceRange: '$25-35', requirements: '25+ jumps minimum' },
  { value: 'COACH_JUMP', label: 'Coach Jump', description: 'Get personal coaching from an expert', icon: 'award', priceRange: '$150-200', requirements: 'Experience required' },
];

type Step = 'TYPE' | 'DATE_TIME' | 'PACKAGE' | 'REVIEW';

interface FormData {
  type: string;
  date: string;
  time: string;
  packageId?: number;
  paymentMethod: 'WALLET' | 'CARD' | 'TICKET';
  termsAccepted: boolean;
}

function getMonthYear(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}
function getDaysInMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}
function formatBookingDate(dateStr: string, timeStr: string): string {
  const date = new Date(`${dateStr}T${timeStr}`);
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function calculateTotalPrice(basePrice: number, packagePrice?: number): number {
  return packagePrice ? basePrice + packagePrice : basePrice;
}

export default function NewBookingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { preselectedPackage } = useLocalSearchParams<{ preselectedPackage: string }>();

  const [currentStep, setCurrentStep] = useState<Step>('TYPE');
  const [formData, setFormData] = useState<FormData>({
    type: JUMP_TYPES[0].value, date: new Date().toISOString().split('T')[0], time: '09:00',
    packageId: preselectedPackage ? parseInt(preselectedPackage) : undefined, paymentMethod: 'WALLET', termsAccepted: false,
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  const { data: packages, isLoading: packagesLoading } = usePackages();
  const { data: slots, isLoading: slotsLoading } = useAvailableSlots(formData.date);
  const { mutate: createBooking, isPending: isCreating } = useCreateBooking();

  const selectedType = JUMP_TYPES.find((t) => t.value === formData.type);
  const selectedPackage = packages?.find((p) => p.id === formData.packageId);
  const totalPrice = calculateTotalPrice(200, selectedPackage?.price);

  const STEPS: Step[] = ['TYPE', 'DATE_TIME', 'PACKAGE', 'REVIEW'];
  const STEP_LABELS = ['Jump Type', 'Date & Time', 'Package', 'Review'];

  const handleNext = () => {
    const idx = STEPS.indexOf(currentStep);
    if (currentStep === 'DATE_TIME' && (!formData.date || !formData.time)) { Alert.alert('Missing Info', 'Please select both a date and time'); return; }
    if (idx < STEPS.length - 1) setCurrentStep(STEPS[idx + 1]);
  };

  const handleBack = () => {
    const idx = STEPS.indexOf(currentStep);
    if (idx === 0) router.back();
    else setCurrentStep(STEPS[idx - 1]);
  };

  const handleConfirmBooking = () => {
    if (!formData.termsAccepted) { Alert.alert('Terms Required', 'Please accept the terms and conditions'); return; }
    createBooking({ type: formData.type, scheduledDate: formData.date, scheduledTime: formData.time, packageId: formData.packageId, paymentMethod: formData.paymentMethod }, {
      onSuccess: () => Alert.alert('Success', 'Booking confirmed! Check your bookings list.', [{ text: 'OK', onPress: () => router.replace('/booking') }]),
      onError: (error) => Alert.alert('Booking Failed', (error as any)?.message || 'Please try again'),
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      {/* Header */}
      <View style={{ paddingTop: insets.top + spacing[2], paddingHorizontal: spacing[6], paddingBottom: spacing[3], backgroundColor: colors.background, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing[3] }}>
          <Pressable onPress={handleBack} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <SLIcon name="chevron-left" size="lg" color={colors.text.primary} />
          </Pressable>
          <Text style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: colors.text.primary }}>New Booking</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Step indicator */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing[2] }}>
          {STEPS.map((step, idx) => (
            <View key={step} style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: STEPS.indexOf(currentStep) >= idx ? colors.brand.primary : colors.gray[200] }}>
                <Text style={{ color: STEPS.indexOf(currentStep) >= idx ? colors.text.inverse : colors.text.tertiary, fontWeight: typography.fontWeight.bold, fontSize: typography.fontSize.sm }}>{idx + 1}</Text>
              </View>
              {idx < 3 && <View style={{ flex: 1, height: 2, marginHorizontal: 4, backgroundColor: STEPS.indexOf(currentStep) > idx ? colors.brand.primary : colors.gray[200] }} />}
            </View>
          ))}
        </View>
        <Text style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>
          Step {STEPS.indexOf(currentStep) + 1} of 4: {STEP_LABELS[STEPS.indexOf(currentStep)]}
        </Text>
      </View>

      {/* TYPE */}
      {currentStep === 'TYPE' && (
        <ScrollView style={{ flex: 1, paddingHorizontal: spacing[6], paddingTop: spacing[6] }} showsVerticalScrollIndicator={false}>
          {JUMP_TYPES.map((type) => (
            <Pressable key={type.value} onPress={() => setFormData({ ...formData, type: type.value })}>
              <SLCard padding="lg" shadow="sm" style={{ marginBottom: spacing[4], borderWidth: 2, borderColor: formData.type === type.value ? colors.brand.primary : colors.border, backgroundColor: formData.type === type.value ? colors.sky[50] : colors.surface } as any}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing[2] }}>
                  <View style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: formData.type === type.value ? colors.brand.primary + '15' : colors.gray[100], alignItems: 'center', justifyContent: 'center', marginRight: spacing[3] }}>
                    <SLIcon name={type.icon} size="md" color={formData.type === type.value ? colors.brand.primary : colors.text.secondary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: typography.fontWeight.bold, fontSize: typography.fontSize.lg, color: colors.text.primary }}>{type.label}</Text>
                    <Text style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary, marginTop: spacing[1] }}>{type.description}</Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing[3] }}>
                  <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary }}>{type.requirements}</Text>
                  <Text style={{ fontWeight: typography.fontWeight.bold, color: colors.brand.primary }}>{type.priceRange}</Text>
                </View>
              </SLCard>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {/* DATE_TIME */}
      {currentStep === 'DATE_TIME' && (
        <ScrollView style={{ flex: 1, paddingHorizontal: spacing[6], paddingTop: spacing[6] }} showsVerticalScrollIndicator={false}>
          <Text style={{ fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.bold, color: colors.text.tertiary, marginBottom: spacing[3], letterSpacing: 1 }}>SELECT DATE</Text>
          <Pressable onPress={() => setShowDatePicker(true)}>
            <SLCard padding="lg" style={{ marginBottom: spacing[6], flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' } as any}>
              <View>
                <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary, marginBottom: spacing[1] }}>Selected Date</Text>
                <Text style={{ fontWeight: typography.fontWeight.bold, color: colors.text.primary }}>
                  {new Date(`${formData.date}T00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </Text>
              </View>
              <SLIcon name="calendar" size="md" color={colors.brand.primary} />
            </SLCard>
          </Pressable>

          <Text style={{ fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.bold, color: colors.text.tertiary, marginBottom: spacing[3], letterSpacing: 1 }}>SELECT TIME SLOT</Text>
          {slotsLoading ? (
            <View style={{ gap: spacing[2] }}><SLSkeleton width="100%" height={60} /><SLSkeleton width="100%" height={60} /></View>
          ) : slots && slots.length > 0 ? (
            slots.map((slot) => (
              <Pressable key={slot.id} onPress={() => setFormData({ ...formData, time: slot.time })}>
                <SLCard padding="md" style={{ marginBottom: spacing[2], borderWidth: 2, borderColor: formData.time === slot.time ? colors.brand.primary : colors.border, backgroundColor: formData.time === slot.time ? colors.sky[50] : colors.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' } as any}>
                  <View>
                    <Text style={{ fontWeight: typography.fontWeight.bold, fontSize: typography.fontSize.lg, color: formData.time === slot.time ? colors.brand.primary : colors.text.primary }}>{slot.time}</Text>
                    <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary, marginTop: spacing[1] }}>{slot.available} of {slot.total} spots available</Text>
                  </View>
                  <SLBadge label={slot.available > 0 ? 'Available' : 'Full'} variant={slot.available > 0 ? 'success' : 'danger'} />
                </SLCard>
              </Pressable>
            ))
          ) : (
            <View style={{ backgroundColor: colors.tint.warning.bg, borderWidth: 1, borderColor: colors.tint.warning.border, borderRadius: 12, padding: spacing[4] }}>
              <Text style={{ fontSize: typography.fontSize.sm, color: colors.tint.warning.text }}>No slots available for this date</Text>
            </View>
          )}

          {/* Date Picker Modal */}
          <Modal visible={showDatePicker} transparent animationType="slide" onRequestClose={() => setShowDatePicker(false)}>
            <View style={{ flex: 1, backgroundColor: colors.surface, paddingTop: insets.top }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing[6], paddingVertical: spacing[4], borderBottomWidth: 1, borderBottomColor: colors.border }}>
                <SLButton label="Cancel" onPress={() => setShowDatePicker(false)} variant="ghost" />
                <Text style={{ fontWeight: typography.fontWeight.bold, color: colors.text.primary }}>{getMonthYear(calendarMonth)}</Text>
                <SLButton label="Done" onPress={() => setShowDatePicker(false)} variant="ghost" />
              </View>
              <ScrollView style={{ flex: 1, paddingHorizontal: spacing[6], paddingTop: spacing[4] }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing[6] }}>
                  <Pressable onPress={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1))}>
                    <SLIcon name="chevron-left" size="md" color={colors.text.primary} />
                  </Pressable>
                  <Text style={{ fontWeight: typography.fontWeight.bold, color: colors.text.primary }}>{getMonthYear(calendarMonth)}</Text>
                  <Pressable onPress={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1))}>
                    <SLIcon name="chevron-right" size="md" color={colors.text.primary} />
                  </Pressable>
                </View>
                <View style={{ flexDirection: 'row', marginBottom: spacing[3], gap: 4 }}>
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                    <Text key={day} style={{ flex: 1, textAlign: 'center', fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.bold, color: colors.text.tertiary, paddingVertical: spacing[2] }}>{day}</Text>
                  ))}
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
                  {Array.from({ length: new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1).getDay() }).map((_, idx) => (
                    <View key={`empty-${idx}`} style={{ flex: 1, minHeight: 48 }} />
                  ))}
                  {Array.from({ length: getDaysInMonth(calendarMonth) }).map((_, idx) => {
                    const day = idx + 1;
                    const dateStr = `${calendarMonth.getFullYear()}-${String(calendarMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const isSelected = formData.date === dateStr;
                    const isToday = dateStr === new Date().toISOString().split('T')[0];
                    const isPast = new Date(dateStr) < new Date();
                    return (
                      <Pressable key={day} disabled={isPast} onPress={() => { setFormData({ ...formData, date: dateStr }); setShowDatePicker(false); }}
                        style={{ flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: isSelected ? colors.brand.primary : isToday ? colors.sky[50] : colors.gray[50], opacity: isPast ? 0.4 : 1, borderWidth: isToday && !isSelected ? 1 : 0, borderColor: colors.sky[300] }}>
                        <Text style={{ fontWeight: typography.fontWeight.semibold, color: isSelected ? colors.text.inverse : isToday ? colors.brand.primary : colors.text.primary }}>{day}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>
            </View>
          </Modal>
        </ScrollView>
      )}

      {/* PACKAGE */}
      {currentStep === 'PACKAGE' && (
        <ScrollView style={{ flex: 1, paddingHorizontal: spacing[6], paddingTop: spacing[6] }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing[8] }}>
          {packagesLoading ? (
            <View style={{ gap: spacing[3] }}><SLSkeleton width="100%" height={140} /><SLSkeleton width="100%" height={140} /></View>
          ) : packages && packages.length > 0 ? (
            packages.map((pkg) => (
              <Pressable key={pkg.id} onPress={() => setFormData({ ...formData, packageId: pkg.id })}>
                <SLCard padding="lg" shadow="sm" style={{ marginBottom: spacing[4], borderWidth: 2, borderColor: formData.packageId === pkg.id ? colors.brand.primary : colors.border, backgroundColor: formData.packageId === pkg.id ? colors.sky[50] : colors.surface } as any}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: spacing[2] }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: typography.fontWeight.bold, fontSize: typography.fontSize.lg, color: colors.text.primary }}>{pkg.name}</Text>
                      <Text style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary, marginTop: spacing[1] }}>{pkg.description}</Text>
                    </View>
                    {pkg.savingsPercent ? <SLBadge label={`Save ${pkg.savingsPercent}%`} variant="success" /> : null}
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing[3], paddingTop: spacing[3], borderTopWidth: 1, borderTopColor: colors.gray[100] }}>
                    <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary }}>{pkg.jumpCount} jumps included</Text>
                    <Text style={{ fontWeight: typography.fontWeight.bold, fontSize: typography.fontSize.lg, color: colors.brand.primary }}>{pkg.price.toFixed(2)} {pkg.currency}</Text>
                  </View>
                </SLCard>
              </Pressable>
            ))
          ) : null}
          <Pressable onPress={() => setFormData({ ...formData, packageId: undefined })}>
            <SLCard padding="lg" style={{ borderWidth: 2, borderColor: formData.packageId === undefined ? colors.brand.primary : colors.border, backgroundColor: formData.packageId === undefined ? colors.sky[50] : colors.surface } as any}>
              <Text style={{ fontWeight: typography.fontWeight.bold, color: colors.text.primary }}>Skip Package (Pay Per Jump)</Text>
              <Text style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary, marginTop: spacing[1] }}>Purchase package later</Text>
            </SLCard>
          </Pressable>
        </ScrollView>
      )}

      {/* REVIEW */}
      {currentStep === 'REVIEW' && (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView style={{ flex: 1, paddingHorizontal: spacing[6], paddingTop: spacing[6] }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing[8] }}>
            <SLCard padding="lg" shadow="sm" style={{ marginBottom: spacing[6] } as any}>
              <Text style={{ fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.bold, color: colors.text.tertiary, marginBottom: spacing[4], letterSpacing: 1 }}>BOOKING SUMMARY</Text>
              <View style={{ marginBottom: spacing[4], paddingBottom: spacing[4], borderBottomWidth: 1, borderBottomColor: colors.gray[100] }}>
                <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary, marginBottom: spacing[1] }}>Jump Type</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
                  {selectedType && <SLIcon name={selectedType.icon} size="md" color={colors.brand.primary} />}
                  <Text style={{ fontWeight: typography.fontWeight.bold, fontSize: typography.fontSize.lg, color: colors.text.primary }}>{selectedType?.label}</Text>
                </View>
              </View>
              <View style={{ marginBottom: spacing[4], paddingBottom: spacing[4], borderBottomWidth: 1, borderBottomColor: colors.gray[100] }}>
                <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary, marginBottom: spacing[1] }}>Date & Time</Text>
                <Text style={{ fontWeight: typography.fontWeight.bold, color: colors.text.primary }}>{formatBookingDate(formData.date, formData.time)}</Text>
              </View>
              <View>
                <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary, marginBottom: spacing[2] }}>Price Breakdown</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing[2] }}>
                  <Text style={{ color: colors.text.secondary }}>Base Booking</Text>
                  <Text style={{ fontWeight: typography.fontWeight.semibold, color: colors.text.primary }}>$200.00</Text>
                </View>
                {selectedPackage && (
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing[3] }}>
                    <Text style={{ color: colors.text.secondary }}>{selectedPackage.name}</Text>
                    <Text style={{ fontWeight: typography.fontWeight.semibold, color: colors.text.primary }}>${selectedPackage.price.toFixed(2)}</Text>
                  </View>
                )}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: spacing[3], borderTopWidth: 1, borderTopColor: colors.gray[100] }}>
                  <Text style={{ fontWeight: typography.fontWeight.bold, color: colors.text.primary }}>Total</Text>
                  <Text style={{ fontWeight: typography.fontWeight.bold, fontSize: typography.fontSize.xl, color: colors.brand.primary }}>${totalPrice.toFixed(2)}</Text>
                </View>
              </View>
            </SLCard>

            {/* Payment */}
            <Text style={{ fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.bold, color: colors.text.tertiary, marginBottom: spacing[3], letterSpacing: 1 }}>PAYMENT METHOD</Text>
            {(['WALLET', 'CARD', 'TICKET'] as const).map((method) => (
              <Pressable key={method} onPress={() => setFormData({ ...formData, paymentMethod: method })}>
                <SLCard padding="md" style={{ marginBottom: spacing[2], borderWidth: 2, borderColor: formData.paymentMethod === method ? colors.brand.primary : colors.border, flexDirection: 'row', alignItems: 'center' } as any}>
                  <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: formData.paymentMethod === method ? colors.brand.primary : colors.gray[300], backgroundColor: formData.paymentMethod === method ? colors.brand.primary : 'transparent', alignItems: 'center', justifyContent: 'center', marginRight: spacing[3] }}>
                    {formData.paymentMethod === method && <SLIcon name="check" size="xs" color={colors.text.inverse} />}
                  </View>
                  <Text style={{ fontWeight: typography.fontWeight.semibold, color: colors.text.primary }}>{method === 'WALLET' ? 'Wallet' : method === 'CARD' ? 'Credit Card' : 'Jump Ticket'}</Text>
                </SLCard>
              </Pressable>
            ))}

            {/* Terms */}
            <Pressable onPress={() => setFormData({ ...formData, termsAccepted: !formData.termsAccepted })} style={{ marginTop: spacing[6], marginBottom: spacing[6], flexDirection: 'row', alignItems: 'flex-start' }}>
              <View style={{ width: 20, height: 20, borderRadius: 4, borderWidth: 2, borderColor: formData.termsAccepted ? colors.brand.primary : colors.gray[300], backgroundColor: formData.termsAccepted ? colors.brand.primary : 'transparent', alignItems: 'center', justifyContent: 'center', marginRight: spacing[3], marginTop: 2 }}>
                {formData.termsAccepted && <SLIcon name="check" size="xs" color={colors.text.inverse} />}
              </View>
              <Text style={{ flex: 1, fontSize: typography.fontSize.sm, color: colors.text.secondary }}>
                I accept the <Text style={{ color: colors.brand.primary, fontWeight: typography.fontWeight.semibold }}>terms and conditions</Text> and <Text style={{ color: colors.brand.primary, fontWeight: typography.fontWeight.semibold }}>waiver</Text>
              </Text>
            </Pressable>
          </ScrollView>

          <View style={{ paddingHorizontal: spacing[6], paddingVertical: spacing[4], paddingBottom: insets.bottom + spacing[4] }}>
            <SLButton label="Confirm Booking" onPress={handleConfirmBooking} fullWidth size="lg" loading={isCreating} iconLeft="check" />
          </View>
        </KeyboardAvoidingView>
      )}

      {/* Nav buttons (not on review) */}
      {currentStep !== 'REVIEW' && (
        <View style={{ paddingHorizontal: spacing[6], paddingVertical: spacing[4], paddingBottom: insets.bottom + spacing[4], gap: spacing[3], backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.border }}>
          <SLButton label={currentStep === 'TYPE' ? 'Cancel' : 'Back'} onPress={handleBack} variant="outline" fullWidth />
          <SLButton label="Continue" onPress={handleNext} fullWidth iconLeft="arrow-right" />
        </View>
      )}
    </View>
  );
}

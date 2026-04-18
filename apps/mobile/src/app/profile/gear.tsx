import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '@/lib/api';
import { SLIcon, SLCard, SLBadge, SLEmptyState } from '@/components/ui';
import { SLSkeleton } from '@/components/ui';
import type { IconName } from '@/components/ui/SLIcon';
import { colors, spacing, typography } from '@/theme';

interface GearItem {
  id: number;
  type: string;
  brand: string;
  model: string;
  serialNumber: string;
  jumpsOnGear: number;
  status: 'Active' | 'Grounded' | 'In Repair';
  lastRePack?: string;
  lastInspection?: string;
  aadExpiryDate?: string;
}

const GEAR_TYPES = [
  'Container',
  'Main',
  'Reserve',
  'AAD',
  'Helmet',
  'Altimeter',
  'Suit',
] as const;

const GEAR_TYPE_ICONS: Record<string, IconName> = {
  Container: 'package',
  Main: 'wind',
  Reserve: 'shield',
  AAD: 'cpu',
  Helmet: 'hard-hat',
  Altimeter: 'gauge',
  Suit: 'shirt',
};

function getStatusVariant(status: string): 'success' | 'danger' | 'warning' | 'info' {
  switch (status) {
    case 'Active': return 'success';
    case 'Grounded': return 'danger';
    case 'In Repair': return 'warning';
    default: return 'info';
  }
}

function getAlertInfo(item: GearItem): { icon: IconName; color: string; label: string } | null {
  // AAD expiring soon
  if (item.type === 'AAD' && item.aadExpiryDate) {
    const expiryDate = new Date(item.aadExpiryDate);
    const daysUntilExpiry = Math.floor(
      (expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysUntilExpiry < 0) return { icon: 'alert-circle', color: colors.brand.danger, label: 'Expired' };
    if (daysUntilExpiry < 30) return { icon: 'alert-triangle', color: colors.accent.orange, label: 'Expiring soon' };
  }

  // Repack due soon (for reserve/container)
  if ((item.type === 'Reserve' || item.type === 'Container') && item.lastRePack) {
    const lastRepackDate = new Date(item.lastRePack);
    const daysSinceRepack = Math.floor(
      (new Date().getTime() - lastRepackDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSinceRepack > 180) return { icon: 'clock', color: colors.brand.warning, label: 'Repack due' };
  }

  // Grounded
  if (item.status === 'Grounded') return { icon: 'alert-circle', color: colors.brand.danger, label: 'Action needed' };

  return null;
}

export default function GearScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [gear, setGear] = useState<GearItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchGear();
  }, []);

  const fetchGear = async () => {
    setIsLoading(true);
    try {
      const { data } = await api.get('/jumpers/me/gear');
      setGear(data || []);
    } catch {
      Alert.alert('Error', 'Failed to load gear');
    } finally {
      setIsLoading(false);
    }
  };

  const groupedGear = GEAR_TYPES.reduce(
    (acc, type) => {
      acc[type] = gear.filter((g) => g.type === type);
      return acc;
    },
    {} as Record<string, GearItem[]>
  );

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
            My Gear
          </Text>
          <Pressable
            onPress={() => router.push('/profile/gear-detail')}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <SLIcon name="plus" size="lg" color={colors.brand.primary} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: spacing[6], paddingBottom: spacing[20] || 80 }}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <View style={{ gap: spacing[3] }}>
            <SLSkeleton width="100%" height={100} />
            <SLSkeleton width="100%" height={100} />
            <SLSkeleton width="100%" height={100} />
          </View>
        ) : gear.length === 0 ? (
          <SLEmptyState
            icon="package"
            title="No Gear Added Yet"
            description="Add your gear to track maintenance and status"
            actionLabel="Add Gear"
            onAction={() => router.push('/profile/gear-detail')}
          />
        ) : (
          <View style={{ gap: spacing[6] }}>
            {GEAR_TYPES.map((type) => {
              const typeGear = groupedGear[type];
              if (typeGear.length === 0) return null;

              return (
                <View key={type}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginBottom: spacing[3] }}>
                    <SLIcon name={GEAR_TYPE_ICONS[type] || 'package'} size="md" color={colors.brand.primary} />
                    <Text style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, color: colors.text.primary }}>
                      {type}
                    </Text>
                  </View>

                  <View style={{ gap: spacing[3] }}>
                    {typeGear.map((item) => {
                      const alertInfo = getAlertInfo(item);
                      return (
                        <Pressable
                          key={item.id}
                          onPress={() =>
                            router.push({
                              pathname: '/profile/gear-detail',
                              params: { gearId: item.id.toString() },
                            })
                          }
                        >
                          <SLCard
                            padding="lg"
                            shadow="sm"
                            style={alertInfo ? {
                              borderWidth: 1,
                              borderColor: alertInfo.color + '40',
                              backgroundColor: alertInfo.color + '08',
                            } : undefined}
                          >
                            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: spacing[2] }}>
                              <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.bold, color: colors.text.primary }}>
                                  {item.brand} {item.model}
                                </Text>
                                <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary, marginTop: 2 }}>
                                  S/N: {item.serialNumber}
                                </Text>
                              </View>
                              <SLBadge label={item.status} variant={getStatusVariant(item.status)} />
                            </View>

                            <View
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                paddingTop: spacing[2],
                                borderTopWidth: 1,
                                borderTopColor: colors.gray[100],
                              }}
                            >
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[1] }}>
                                <SLIcon name="plane" size="xs" color={colors.text.tertiary} />
                                <Text style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>
                                  {item.jumpsOnGear} jumps
                                </Text>
                              </View>

                              {alertInfo && (
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[1] }}>
                                  <SLIcon name={alertInfo.icon} size="xs" color={alertInfo.color} />
                                  <Text style={{ fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.semibold, color: alertInfo.color }}>
                                    {alertInfo.label}
                                  </Text>
                                </View>
                              )}

                              <SLIcon name="chevron-right" size="sm" color={colors.text.tertiary} />
                            </View>
                          </SLCard>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* FAB - Add Gear */}
      {gear.length > 0 && (
        <Pressable
          onPress={() => router.push('/profile/gear-detail')}
          style={{
            position: 'absolute',
            bottom: insets.bottom + spacing[6],
            right: spacing[6],
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: colors.brand.primary,
            alignItems: 'center',
            justifyContent: 'center',
            ...({ boxShadow: '0px 4px 12px rgba(14, 165, 233, 0.4)' } as any),
          }}
        >
          <SLIcon name="plus" size="lg" color={colors.text.inverse} />
        </Pressable>
      )}
    </View>
  );
}

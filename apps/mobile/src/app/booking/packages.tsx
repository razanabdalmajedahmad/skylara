import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { usePackages, Package } from '@/hooks/useBookings';
import { SLIcon, SLButton, SLCard, SLEmptyState } from '@/components/ui';
import { SLSkeleton } from '@/components/ui';
import type { IconName } from '@/components/ui/SLIcon';
import { colors, spacing, typography } from '@/theme';

type FilterType = 'ALL' | 'TANDEM' | 'AFF' | 'FUN_JUMP';

const FILTER_OPTIONS: { value: FilterType; label: string; icon: IconName }[] = [
  { value: 'ALL', label: 'All', icon: 'package' },
  { value: 'TANDEM', label: 'Tandem', icon: 'users' },
  { value: 'AFF', label: 'AFF', icon: 'book-open' },
  { value: 'FUN_JUMP', label: 'Fun Jump', icon: 'wind' },
];

const TYPE_ICONS: Record<string, IconName> = {
  TANDEM: 'users', AFF: 'book-open', FUN_JUMP: 'wind',
};

function PackageCard({ pkg, onSelect }: { pkg: Package; onSelect: (pkg: Package) => void }) {
  const icon = TYPE_ICONS[pkg.type] || 'package';
  return (
    <Pressable onPress={() => onSelect(pkg)}>
      <SLCard shadow="sm" style={{ marginBottom: spacing[4], overflow: 'hidden' } as any}>
        {/* Header */}
        <View style={{ backgroundColor: colors.brand.primary, paddingHorizontal: spacing[5], paddingVertical: spacing[6], flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginBottom: spacing[2] }}>
              <SLIcon name={icon} size="md" color={colors.text.inverse} />
              <Text style={{ color: colors.text.inverse, fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, flex: 1 }}>{pkg.name}</Text>
            </View>
            <Text style={{ color: colors.text.inverse, fontSize: typography.fontSize.sm, opacity: 0.9 }}>{pkg.description}</Text>
          </View>
          {pkg.savingsPercent ? (
            <View style={{ backgroundColor: colors.brand.success, paddingHorizontal: spacing[2], paddingVertical: spacing[1], borderRadius: 20, marginLeft: spacing[2] }}>
              <Text style={{ color: colors.text.inverse, fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.bold }}>Save {pkg.savingsPercent}%</Text>
            </View>
          ) : null}
        </View>

        {/* Content */}
        <View style={{ paddingHorizontal: spacing[5], paddingVertical: spacing[6] }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing[4], paddingBottom: spacing[4], borderBottomWidth: 1, borderBottomColor: colors.gray[100] }}>
            <View><Text style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary, marginBottom: spacing[1] }}>Jumps</Text><Text style={{ fontSize: 24, fontWeight: typography.fontWeight.bold, color: colors.text.primary }}>{pkg.jumpCount}</Text></View>
            <View><Text style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary, marginBottom: spacing[1] }}>Per Jump</Text><Text style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, color: colors.text.primary }}>${(pkg.price / pkg.jumpCount).toFixed(2)}</Text></View>
            <View><Text style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary, marginBottom: spacing[1] }}>Total</Text><Text style={{ fontSize: 24, fontWeight: typography.fontWeight.bold, color: colors.brand.primary }}>${pkg.price.toFixed(2)}</Text></View>
          </View>

          {pkg.included && pkg.included.length > 0 && (
            <View style={{ marginBottom: spacing[4] }}>
              <Text style={{ fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.bold, color: colors.text.secondary, marginBottom: spacing[2] }}>WHAT'S INCLUDED</Text>
              {pkg.included.map((item, idx) => (
                <View key={idx} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing[2], marginBottom: spacing[2] }}>
                  <SLIcon name="check" size="xs" color={colors.brand.success} />
                  <Text style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary, flex: 1 }}>{item}</Text>
                </View>
              ))}
            </View>
          )}

          <SLButton label="Select Package" onPress={() => onSelect(pkg)} fullWidth />
        </View>
      </SLCard>
    </Pressable>
  );
}

export default function PackagesBrowserScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeFilter, setActiveFilter] = useState<FilterType>('ALL');

  const { data: packages, isLoading, error } = usePackages();

  const filteredPackages = useMemo(() => {
    if (!packages) return [];
    if (activeFilter === 'ALL') return packages;
    return packages.filter((pkg) => pkg.type === activeFilter);
  }, [packages, activeFilter]);

  const handleSelectPackage = (pkg: Package) => {
    router.push(`/booking/new?preselectedPackage=${pkg.id}`);
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.surface }}>
        <View style={{ paddingTop: insets.top + spacing[2], paddingHorizontal: spacing[6], paddingBottom: spacing[4], backgroundColor: colors.background, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <Text style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: colors.text.primary }}>Packages</Text>
        </View>
        <View style={{ padding: spacing[6], gap: spacing[3] }}><SLSkeleton width="100%" height={200} /><SLSkeleton width="100%" height={200} /></View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      {/* Header */}
      <View style={{ paddingTop: insets.top + spacing[2], paddingHorizontal: spacing[6], paddingBottom: spacing[3], backgroundColor: colors.background, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Pressable onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <SLIcon name="chevron-left" size="lg" color={colors.text.primary} />
          </Pressable>
          <Text style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: colors.text.primary }}>Packages</Text>
          <View style={{ width: 24 }} />
        </View>
      </View>

      {/* Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ backgroundColor: colors.background, borderBottomWidth: 1, borderBottomColor: colors.border }} contentContainerStyle={{ paddingHorizontal: spacing[4], paddingVertical: spacing[3], gap: spacing[2] }}>
        {FILTER_OPTIONS.map((filter) => (
          <Pressable key={filter.value} onPress={() => setActiveFilter(filter.value)}
            style={{ paddingHorizontal: spacing[4], paddingVertical: spacing[2], borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: spacing[2], backgroundColor: activeFilter === filter.value ? colors.brand.primary : colors.gray[100] }}>
            <SLIcon name={filter.icon} size="xs" color={activeFilter === filter.value ? colors.text.inverse : colors.text.secondary} />
            <Text style={{ fontWeight: typography.fontWeight.semibold, fontSize: typography.fontSize.sm, color: activeFilter === filter.value ? colors.text.inverse : colors.text.secondary }}>{filter.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {error ? (
        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: spacing[6] }}>
          <SLEmptyState icon="alert-circle" title="Error Loading Packages" description="Failed to load packages. Please try again." actionLabel="Go Back" onAction={() => router.back()} />
        </View>
      ) : filteredPackages.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: spacing[6] }}>
          <SLEmptyState icon="package" title="No Packages Available" description="No packages found for this category" actionLabel="Book Without Package" onAction={() => router.push('/booking/new')} />
        </View>
      ) : (
        <FlatList
          data={filteredPackages}
          renderItem={({ item }) => <PackageCard pkg={item} onSelect={handleSelectPackage} />}
          keyExtractor={(item) => String(item.id)}
          style={{ flex: 1, paddingHorizontal: spacing[4], paddingTop: spacing[4] }}
          contentContainerStyle={{ paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDropzoneStore } from '@/stores/dropzone';
import { api } from '@/lib/api';
import { SLIcon, SLButton, SLCard, SLBadge, SLEmptyState } from '@/components/ui';
import { SLSkeleton } from '@/components/ui';
import { colors, spacing, typography } from '@/theme';

interface Waiver {
  id: number;
  type: string;
  status: 'Signed' | 'Pending' | 'Expired';
  signedDate?: string;
  expiryDate?: string;
  documentUrl?: string;
}

function getStatusVariant(status: string): 'success' | 'warning' | 'danger' | 'info' {
  switch (status) {
    case 'Signed': return 'success';
    case 'Pending': return 'warning';
    case 'Expired': return 'danger';
    default: return 'info';
  }
}

export default function WaiversScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { activeDz } = useDropzoneStore();

  const [waivers, setWaivers] = useState<Waiver[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchWaivers = useCallback(async () => {
    if (!activeDz) return;

    setIsLoading(true);
    try {
      const { data } = await api.get('/waivers/me');
      setWaivers(data || []);
    } catch {
      Alert.alert('Error', 'Failed to load waivers');
    } finally {
      setIsLoading(false);
    }
  }, [activeDz]);

  useEffect(() => {
    if (activeDz) {
      void fetchWaivers();
    }
  }, [activeDz, fetchWaivers]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleSignWaiver = (waiverType: string) => {
    Alert.alert(
      'Sign Waiver',
      `You are about to sign the ${waiverType} waiver. This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign',
          style: 'default',
          onPress: () => {
            Alert.alert(
              'Coming Soon',
              'The waiver signing interface will be available soon.'
            );
          },
        },
      ]
    );
  };

  // No dropzone selected state
  if (!activeDz) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.surface }}>
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
              Waivers
            </Text>
            <View style={{ width: 24 }} />
          </View>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: spacing[6] }}>
          <SLEmptyState
            icon="map-pin"
            title="No Dropzone Selected"
            description="Please select a dropzone to view your waivers"
            actionLabel="Find a Dropzone"
            onAction={() => router.push('/discover')}
          />
        </View>
      </View>
    );
  }

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
            Waivers
          </Text>
          <Pressable onPress={fetchWaivers} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <SLIcon name="refresh" size="md" color={colors.text.tertiary} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: spacing[6], paddingBottom: spacing[12] }}
        showsVerticalScrollIndicator={false}
      >
        {/* Dropzone Info Banner */}
        <View
          style={{
            backgroundColor: colors.sky[50],
            borderWidth: 1,
            borderColor: colors.sky[200],
            borderRadius: 12,
            padding: spacing[4],
            marginBottom: spacing[6],
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing[3],
          }}
        >
          <SLIcon name="map-pin" size="md" color={colors.brand.primary} />
          <View>
            <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.secondary }}>Current Dropzone</Text>
            <Text style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, color: colors.text.primary }}>
              {activeDz.name}
            </Text>
          </View>
        </View>

        {isLoading ? (
          <View style={{ gap: spacing[3] }}>
            <SLSkeleton width="100%" height={140} />
            <SLSkeleton width="100%" height={140} />
          </View>
        ) : waivers.length === 0 ? (
          <SLEmptyState
            icon="clipboard"
            title="No Waivers Found"
            description="There are no waivers for this dropzone"
          />
        ) : (
          <View style={{ gap: spacing[3] }}>
            {waivers.map((waiver) => (
              <SLCard key={waiver.id} padding="lg" shadow="sm">
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: spacing[3] }}>
                  <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing[3] }}>
                    <View
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 8,
                        backgroundColor: waiver.status === 'Signed' ? colors.tint.success.bg : waiver.status === 'Expired' ? colors.tint.danger.bg : colors.gray[100],
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <SLIcon
                        name={waiver.status === 'Signed' ? 'check-circle' : waiver.status === 'Expired' ? 'alert-circle' : 'file-text'}
                        size="md"
                        color={waiver.status === 'Signed' ? colors.brand.success : waiver.status === 'Expired' ? colors.brand.danger : colors.text.tertiary}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.bold, color: colors.text.primary }}>
                        {waiver.type}
                      </Text>
                    </View>
                  </View>
                  <SLBadge label={waiver.status} variant={getStatusVariant(waiver.status)} />
                </View>

                <View style={{ gap: spacing[1], marginBottom: spacing[4] }}>
                  {waiver.signedDate && (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary }}>Signed:</Text>
                      <Text style={{ fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.semibold, color: colors.text.secondary }}>
                        {formatDate(waiver.signedDate)}
                      </Text>
                    </View>
                  )}
                  {waiver.expiryDate && (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary }}>Expires:</Text>
                      <Text style={{ fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.semibold, color: colors.text.secondary }}>
                        {formatDate(waiver.expiryDate)}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={{ flexDirection: 'row', gap: spacing[2] }}>
                  {waiver.documentUrl && (
                    <View style={{ flex: 1 }}>
                      <SLButton
                        label="View"
                        onPress={() => Alert.alert('Coming Soon', 'Document viewer will be available soon.')}
                        variant="outline"
                        size="sm"
                        fullWidth
                        iconLeft="eye"
                      />
                    </View>
                  )}
                  {waiver.status === 'Pending' && (
                    <View style={{ flex: 1 }}>
                      <SLButton
                        label="Sign"
                        onPress={() => handleSignWaiver(waiver.type)}
                        size="sm"
                        fullWidth
                        iconLeft="pen-tool"
                      />
                    </View>
                  )}
                  {waiver.status === 'Expired' && (
                    <View style={{ flex: 1 }}>
                      <SLButton
                        label="Renew"
                        onPress={() => handleSignWaiver(waiver.type)}
                        variant="outline"
                        size="sm"
                        fullWidth
                        iconLeft="refresh"
                      />
                    </View>
                  )}
                </View>
              </SLCard>
            ))}
          </View>
        )}

        {/* Info Box */}
        <View
          style={{
            backgroundColor: colors.sky[50],
            borderWidth: 1,
            borderColor: colors.sky[200],
            borderRadius: 12,
            padding: spacing[4],
            marginTop: spacing[6],
            flexDirection: 'row',
            gap: spacing[3],
          }}
        >
          <SLIcon name="info" size="md" color={colors.brand.primary} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.semibold, color: colors.sky[700], marginBottom: spacing[1] }}>
              Note
            </Text>
            <Text style={{ fontSize: typography.fontSize.xs, color: colors.sky[600], lineHeight: 18 }}>
              Waivers are specific to each dropzone. Make sure all your waivers are current and
              signed before jumping.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

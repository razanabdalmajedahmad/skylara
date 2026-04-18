import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Modal,
  TextInput,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useManifestStore, type TeamMember } from '@/stores/manifest';
import { useAuthStore } from '@/stores/auth';
import JumpTypePicker from '@/components/JumpTypePicker';
import PaymentMethodPicker from '@/components/PaymentMethodPicker';
import FormationPicker from '@/components/FormationPicker';
import { SLIcon, SLButton, SLCard, SLEmptyState } from '@/components/ui';
import { colors, spacing, typography } from '@/theme';

const JUMP_TYPES = [
  { id: 'FT150_PACK', name: 'Full Altitude 150 (pack)', price: 18 },
  { id: 'FT150', name: 'Full Altitude 150', price: 22 },
  { id: 'FT260_PACK', name: 'Full Altitude 260 (pack)', price: 25 },
  { id: 'FT260', name: 'Full Altitude 260', price: 30 },
];

type PaymentMethod = 'BLOCK_TICKET' | 'WALLET' | 'CARD';

export default function LoadBuilderScreen() {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const {
    teams,
    activeTeam: _activeTeam,
    selfManifest: _selfManifest,
    createTeam,
    deleteTeam,
    setActiveTeam,
    setSelfManifest,
    clearSelfManifest: _clearSelfManifest,
  } = useManifestStore();

  const [activeTab, setActiveTab] = useState<'teams' | 'history' | 'add-me'>('teams');
  const [showNewTeamModal, setShowNewTeamModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');

  // Self-manifest state
  const [selfManifestStep, setSelfManifestStep] = useState<1 | 2 | 3>(1);
  const [selectedJumpType, setSelectedJumpType] = useState<string>(JUMP_TYPES[0].id);
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod>('BLOCK_TICKET');
  const [selectedFormation, setSelectedFormation] = useState<string>('FS');
  const [showFormationPicker, setShowFormationPicker] = useState(false);

  const handleCreateTeam = () => {
    if (newTeamName.trim()) {
      createTeam(newTeamName);
      setNewTeamName('');
      setShowNewTeamModal(false);
    }
  };

  const handleAddMeSelf = () => {
    if (!user) return;
    const jumpTypeObj = JUMP_TYPES.find((jt) => jt.id === selectedJumpType);
    const member: TeamMember = {
      userId: user.id,
      name: `${user.firstName} ${user.lastName}`,
      jumpType: jumpTypeObj?.name || selectedJumpType,
      paymentMethod: selectedPayment,
      formation: selectedFormation,
      isCheckedIn: true,
    };
    setSelfManifest(member);
    router.push('/manifest/select-load');
  };

  const tabs = [
    { key: 'teams', label: 'Teams', icon: 'users' as const },
    { key: 'history', label: 'History', icon: 'clock' as const },
    { key: 'add-me', label: 'Add Me', icon: 'user-plus' as const },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + spacing[2],
          paddingHorizontal: spacing[6],
          paddingBottom: spacing[3],
          backgroundColor: colors.background,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing[3] }}>
          <Pressable onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <SLIcon name="chevron-left" size="lg" color={colors.text.primary} />
          </Pressable>
          <Text style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: colors.text.primary }}>
            Load Builder
          </Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Tabs */}
        <View style={{ flexDirection: 'row', backgroundColor: colors.gray[100], borderRadius: 8, padding: 2 }}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                onPress={() => setActiveTab(tab.key as any)}
                style={{
                  flex: 1,
                  paddingVertical: spacing[2],
                  borderRadius: 6,
                  alignItems: 'center',
                  backgroundColor: isActive ? colors.surface : 'transparent',
                  ...(isActive ? { boxShadow: '0px 1px 3px rgba(0,0,0,0.1)' } as any : {}),
                }}
              >
                <Text
                  style={{
                    fontSize: typography.fontSize.sm,
                    fontWeight: isActive ? typography.fontWeight.bold : typography.fontWeight.medium,
                    color: isActive ? colors.brand.primary : colors.text.secondary,
                  }}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: spacing[20] || 80 }}>
        {/* TEAMS TAB */}
        {activeTab === 'teams' && (
          <View style={{ padding: spacing[6] }}>
            <SLButton
              label="Create Team"
              onPress={() => setShowNewTeamModal(true)}
              fullWidth
              iconLeft="plus"
            />

            {teams.length === 0 ? (
              <View style={{ marginTop: spacing[8] }}>
                <SLEmptyState
                  icon="users"
                  title="No Teams Yet"
                  description="Create your first team to manifest together"
                />
              </View>
            ) : (
              <View style={{ marginTop: spacing[4], gap: spacing[3] }}>
                {teams.map((item) => (
                  <SLCard key={item.id} padding="lg" shadow="sm">
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing[2] }}>
                      <Text style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, color: colors.text.primary }}>
                        {item.name}
                      </Text>
                      <Pressable
                        onPress={() => deleteTeam(item.id)}
                        style={{ paddingHorizontal: spacing[3], paddingVertical: spacing[1], backgroundColor: colors.tint.danger.bg, borderRadius: 6 }}
                      >
                        <Text style={{ fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.bold, color: colors.brand.danger }}>
                          Delete
                        </Text>
                      </Pressable>
                    </View>
                    <Text style={{ fontSize: typography.fontSize.sm, color: colors.text.tertiary, marginBottom: spacing[3] }}>
                      {item.members.length} member{item.members.length !== 1 ? 's' : ''}
                    </Text>
                    <SLButton
                      label="Use This Team"
                      onPress={() => setActiveTeam(item)}
                      size="sm"
                      fullWidth
                      iconLeft="check"
                    />
                  </SLCard>
                ))}
              </View>
            )}
          </View>
        )}

        {/* HISTORY TAB */}
        {activeTab === 'history' && (
          <View style={{ padding: spacing[6] }}>
            <SLEmptyState
              icon="clock"
              title="No History Yet"
              description="Your team manifesting history will appear here"
            />
          </View>
        )}

        {/* ADD ME TAB */}
        {activeTab === 'add-me' && (
          <View style={{ padding: spacing[6] }}>
            {/* Step indicator */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[2], marginBottom: spacing[6] }}>
              {[1, 2, 3].map((step) => (
                <View
                  key={step}
                  style={{
                    width: step === selfManifestStep ? 32 : 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: step <= selfManifestStep ? colors.brand.primary : colors.gray[200],
                  }}
                />
              ))}
            </View>

            {selfManifestStep === 1 && (
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginBottom: spacing[4] }}>
                  <SLIcon name="plane" size="md" color={colors.brand.primary} />
                  <Text style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, color: colors.text.primary }}>
                    Step 1: Jump Type
                  </Text>
                </View>
                <JumpTypePicker
                  selected={selectedJumpType}
                  onSelect={setSelectedJumpType}
                  jumpTypes={JUMP_TYPES}
                />
                <View style={{ marginTop: spacing[6] }}>
                  <SLButton label="Next" onPress={() => setSelfManifestStep(2)} fullWidth iconLeft="arrow-right" />
                </View>
              </View>
            )}

            {selfManifestStep === 2 && (
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginBottom: spacing[4] }}>
                  <SLIcon name="credit-card" size="md" color={colors.brand.primary} />
                  <Text style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, color: colors.text.primary }}>
                    Step 2: Payment Method
                  </Text>
                </View>
                <PaymentMethodPicker
                  selected={selectedPayment}
                  onSelect={setSelectedPayment}
                />
                <View style={{ flexDirection: 'row', gap: spacing[3], marginTop: spacing[6] }}>
                  <View style={{ flex: 1 }}>
                    <SLButton label="Back" onPress={() => setSelfManifestStep(1)} variant="outline" fullWidth />
                  </View>
                  <View style={{ flex: 1 }}>
                    <SLButton label="Next" onPress={() => setSelfManifestStep(3)} fullWidth iconLeft="arrow-right" />
                  </View>
                </View>
              </View>
            )}

            {selfManifestStep === 3 && (
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginBottom: spacing[4] }}>
                  <SLIcon name="target" size="md" color={colors.brand.primary} />
                  <Text style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, color: colors.text.primary }}>
                    Step 3: Formation
                  </Text>
                </View>
                <Pressable
                  onPress={() => setShowFormationPicker(true)}
                  style={{
                    backgroundColor: colors.surface,
                    borderWidth: 2,
                    borderColor: colors.brand.primary,
                    padding: spacing[4],
                    borderRadius: 12,
                    marginBottom: spacing[6],
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.semibold, color: colors.brand.primary }}>
                    {selectedFormation}
                  </Text>
                </Pressable>

                <View style={{ flexDirection: 'row', gap: spacing[3] }}>
                  <View style={{ flex: 1 }}>
                    <SLButton label="Back" onPress={() => setSelfManifestStep(2)} variant="outline" fullWidth />
                  </View>
                  <View style={{ flex: 1 }}>
                    <SLButton label="Add to Load" onPress={handleAddMeSelf} fullWidth iconLeft="check" />
                  </View>
                </View>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Bottom Action Bar */}
      <View
        style={{
          backgroundColor: colors.background,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          paddingHorizontal: spacing[4],
          paddingVertical: spacing[3],
          paddingBottom: insets.bottom + spacing[3],
          flexDirection: 'row',
          gap: spacing[2],
        }}
      >
        <View style={{ flex: 1 }}>
          <SLButton label="Select Load" onPress={() => router.push('/manifest/select-load')} fullWidth size="sm" iconLeft="plane" />
        </View>
        <View style={{ flex: 1 }}>
          <SLButton label="Message" onPress={() => router.push('/manifest/select-load')} variant="outline" fullWidth size="sm" iconLeft="message-square" />
        </View>
        <View style={{ flex: 1 }}>
          <SLButton label="Scan QR" onPress={() => router.push('/checkin/scan')} variant="outline" fullWidth size="sm" iconLeft="qr-code" />
        </View>
      </View>

      {/* New Team Modal */}
      <Modal visible={showNewTeamModal} transparent animationType="fade" onRequestClose={() => setShowNewTeamModal(false)}>
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' }}
          onPress={() => setShowNewTeamModal(false)}
        >
          <Pressable
            style={{ backgroundColor: colors.surface, padding: spacing[6], borderRadius: 16, width: '85%', maxWidth: 340 }}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginBottom: spacing[4] }}>
              <SLIcon name="users" size="md" color={colors.brand.primary} />
              <Text style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, color: colors.text.primary }}>
                Create Team
              </Text>
            </View>
            <TextInput
              placeholder="Team name"
              value={newTeamName}
              onChangeText={setNewTeamName}
              placeholderTextColor={colors.text.tertiary}
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 8,
                paddingHorizontal: spacing[4],
                paddingVertical: spacing[3],
                marginBottom: spacing[4],
                fontSize: typography.fontSize.sm,
                color: colors.text.primary,
              }}
            />
            <View style={{ flexDirection: 'row', gap: spacing[2] }}>
              <View style={{ flex: 1 }}>
                <SLButton label="Cancel" onPress={() => setShowNewTeamModal(false)} variant="ghost" fullWidth />
              </View>
              <View style={{ flex: 1 }}>
                <SLButton label="Create" onPress={handleCreateTeam} fullWidth />
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Formation Picker Modal */}
      <FormationPicker
        visible={showFormationPicker}
        selected={selectedFormation}
        onSelect={(formation) => {
          setSelectedFormation(formation);
          setShowFormationPicker(false);
        }}
        onClose={() => setShowFormationPicker(false)}
      />
    </View>
  );
}

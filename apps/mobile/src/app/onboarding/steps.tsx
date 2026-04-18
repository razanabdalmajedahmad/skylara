import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SLButton, SLCard, SLIcon, SLInput, SLProgressBar, SLBadge, SLAvatar } from '@/components/ui';
import type { IconName } from '@/components/ui/SLIcon';
import { colors, spacing, typography, radii } from '@/theme';
import { useOnboarding } from '@/hooks/useOnboarding';
import {
  PERSONA_LABELS,
  TOTAL_STEPS,
  type Persona,
  type StepData,
} from '@/stores/onboarding';

// ─── Step Configuration ──────────────────────────────────────────────────────

const STEP_TITLES: Record<number, string> = {
  1: 'Personal Info',
  2: 'Your Journey',
  3: 'Vertical Identity',
  4: 'Professional History',
  5: 'Travel & Booking',
  6: 'Profile Summary',
  7: 'Complete',
};

// ─── Main Steps Screen ──────────────────────────────────────────────────────

export default function OnboardingSteps() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    persona,
    currentStep,
    stepData,
    isSubmitting,
    startSession,
    submitStep,
    completeOnboarding,
    abandonOnboarding,
    prevStep,
    sessionId,
    isComplete,
    restore,
  } = useOnboarding();

  const [isRestoring, setIsRestoring] = useState(true);

  // Hydrate store from AsyncStorage on mount (handles deep-links & resume)
  useEffect(() => {
    restore().finally(() => setIsRestoring(false));
  }, [restore]);

  // Start backend session on mount if not already started
  useEffect(() => {
    if (persona && !sessionId) {
      startSession(persona).catch(() => {
        // Non-blocking — we can still collect data locally
      });
    }
  }, [persona, sessionId, startSession]);

  // Redirect if complete (deferred to avoid navigating before Root Layout mounts)
  useEffect(() => {
    if (isComplete) {
      const id = requestAnimationFrame(() => router.replace('/(tabs)/home'));
      return () => cancelAnimationFrame(id);
    }
  }, [isComplete, router]);

  // Redirect if no persona after restore (deferred to avoid navigating before Root Layout mounts)
  useEffect(() => {
    if (!isRestoring && !persona) {
      const id = requestAnimationFrame(() => router.replace('/onboarding/welcome'));
      return () => cancelAnimationFrame(id);
    }
  }, [isRestoring, persona, router]);

  if (isRestoring || !persona) return null;

  const progress = currentStep / TOTAL_STEPS;
  const isLastStep = currentStep === TOTAL_STEPS;
  const localData = stepData[currentStep] || {};

  const handleContinue = async (data: StepData) => {
    try {
      if (isLastStep) {
        await completeOnboarding();
        router.replace('/(tabs)/home');
      } else {
        await submitStep(currentStep, data);
      }
    } catch {
      // Error already shown by hook
    }
  };

  const handleBack = () => {
    if (currentStep === 1) {
      Alert.alert(
        'Leave Onboarding?',
        'Your progress will be saved.',
        [
          { text: 'Stay', style: 'cancel' },
          {
            text: 'Leave',
            style: 'destructive',
            onPress: () => router.back(),
          },
        ]
      );
    } else {
      prevStep();
    }
  };

  const handleAbandon = () => {
    Alert.alert(
      'Abandon Onboarding?',
      'All progress will be lost.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Abandon',
          style: 'destructive',
          onPress: async () => {
            await abandonOnboarding();
            router.replace('/onboarding/welcome');
          },
        },
      ]
    );
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header with progress */}
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
          <Pressable onPress={handleBack} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <SLIcon name="chevron-left" size="lg" color={colors.text.primary} />
          </Pressable>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: colors.text.primary }}>
              Step {currentStep} of {TOTAL_STEPS}
            </Text>
            <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary }}>
              {STEP_TITLES[currentStep] || `Step ${currentStep}`}
            </Text>
          </View>
          <Pressable onPress={handleAbandon} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <SLIcon name="x" size="lg" color={colors.text.tertiary} />
          </Pressable>
        </View>
        <SLProgressBar progress={progress} color={colors.brand.primary} height={4} />
      </View>

      {/* Step Content */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: spacing[6], paddingBottom: spacing[20] }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {currentStep === 1 && (
          <PersonalInfoStep
            data={localData}
            persona={persona}
            onSubmit={handleContinue}
            isSubmitting={isSubmitting}
          />
        )}
        {currentStep === 2 && (
          <JourneyStep
            persona={persona}
            onSubmit={handleContinue}
            isSubmitting={isSubmitting}
          />
        )}
        {currentStep === 3 && (
          <VerticalIdentityStep
            data={localData}
            persona={persona}
            onSubmit={handleContinue}
            isSubmitting={isSubmitting}
          />
        )}
        {currentStep === 4 && (
          <ProfessionalHistoryStep
            data={localData}
            persona={persona}
            onSubmit={handleContinue}
            isSubmitting={isSubmitting}
          />
        )}
        {currentStep === 5 && (
          <TravelBookingStep
            data={localData}
            persona={persona}
            onSubmit={handleContinue}
            isSubmitting={isSubmitting}
          />
        )}
        {currentStep === 6 && (
          <ProfileSummaryStep
            stepData={stepData}
            persona={persona}
            onSubmit={handleContinue}
            isSubmitting={isSubmitting}
          />
        )}
        {currentStep === 7 && (
          <CompleteStep
            persona={persona}
            onSubmit={handleContinue}
            isSubmitting={isSubmitting}
          />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Step Props ──────────────────────────────────────────────────────────────

interface StepProps {
  data?: StepData;
  persona: Persona;
  onSubmit: (data: StepData) => void;
  isSubmitting: boolean;
}

interface SummaryStepProps {
  stepData: Record<number, StepData>;
  persona: Persona;
  onSubmit: (data: StepData) => void;
  isSubmitting: boolean;
}

// ─── Step 1: Personal Info ───────────────────────────────────────────────────

function PersonalInfoStep({ data = {}, persona, onSubmit, isSubmitting }: StepProps) {
  const [fullName, setFullName] = useState(data.fullName || '');
  const [email, setEmail] = useState(data.email || '');
  const [phone, setPhone] = useState(data.phone || '');
  const [nationality, setNationality] = useState(data.nationality || '');

  const isValid = fullName.trim().length >= 2 && email.includes('@') && phone.length >= 6;

  return (
    <View style={{ gap: spacing[4] }}>
      <Text style={{ fontSize: typography.fontSize['2xl'], fontWeight: typography.fontWeight.bold, color: colors.text.primary }}>
        Tell us about yourself
      </Text>
      <Text style={{ fontSize: typography.fontSize.sm, color: colors.text.tertiary, marginBottom: spacing[2] }}>
        This information helps us personalize your {PERSONA_LABELS[persona]} experience.
      </Text>

      <SLInput
        label="Full Name"
        placeholder="Enter your full name"
        value={fullName}
        onChangeText={setFullName}
        iconLeft="user"
        autoCapitalize="words"
      />
      <SLInput
        label="Email"
        placeholder="your@email.com"
        value={email}
        onChangeText={setEmail}
        iconLeft="send"
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <SLInput
        label="Phone"
        placeholder="Phone number"
        value={phone}
        onChangeText={setPhone}
        iconLeft="smartphone"
        keyboardType="phone-pad"
      />
      <SLInput
        label="Nationality"
        placeholder="Select your nationality"
        value={nationality}
        onChangeText={setNationality}
        iconLeft="globe"
      />

      <View style={{ marginTop: spacing[4] }}>
        <SLButton
          label="Continue"
          onPress={() =>
            onSubmit({
              fullName: fullName.trim(),
              email: email.trim(),
              phone: phone.trim(),
              nationality: nationality.trim(),
            })
          }
          size="lg"
          fullWidth
          disabled={!isValid}
          loading={isSubmitting}
          iconRight="arrow-right"
        />
      </View>
    </View>
  );
}

// ─── Step 2: Journey (Motivational Transition) ──────────────────────────────

function JourneyStep({ persona, onSubmit, isSubmitting }: StepProps) {
  const messages: Record<Persona, { title: string; body: string }> = {
    coach: {
      title: 'Your Coaching Journey',
      body: 'Next, we\'ll capture your certifications, disciplines, and professional experience so dropzones can find and book you instantly.',
    },
    videographer: {
      title: 'Your Creative Journey',
      body: 'Next, we\'ll set up your camera portfolio, specializations, and the types of jumps you love filming.',
    },
    tunnel: {
      title: 'Your Flight Journey',
      body: 'Next, we\'ll capture your tunnel time, skill levels, and the disciplines you train in.',
    },
    beginner: {
      title: 'Your Adventure Begins',
      body: 'Next, we\'ll learn about your interests and goals so we can recommend the perfect first jump experience.',
    },
    organizer: {
      title: 'Your Operations Journey',
      body: 'Next, we\'ll set up your dropzone profile, aircraft, and operational preferences.',
    },
  };

  const m = messages[persona];

  return (
    <View style={{ alignItems: 'center', paddingTop: spacing[8] }}>
      <View
        style={{
          width: 80,
          height: 80,
          borderRadius: 40,
          backgroundColor: colors.sky[100],
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: spacing[6],
        }}
      >
        <Text style={{ fontSize: 36, fontWeight: typography.fontWeight.bold, color: colors.brand.primary }}>
          3
        </Text>
      </View>

      <Text style={{ fontSize: typography.fontSize['2xl'], fontWeight: typography.fontWeight.bold, color: colors.text.primary, textAlign: 'center', marginBottom: spacing[3] }}>
        {m.title}
      </Text>
      <Text style={{ fontSize: typography.fontSize.base, color: colors.text.secondary, textAlign: 'center', lineHeight: typography.lineHeight.base, maxWidth: 320 }}>
        {m.body}
      </Text>

      <View style={{ marginTop: spacing[8], width: '100%' }}>
        <SLButton
          label="Continue"
          onPress={() => onSubmit({ acknowledged: true })}
          size="lg"
          fullWidth
          loading={isSubmitting}
          iconRight="arrow-right"
        />
      </View>
    </View>
  );
}

// ─── Step 3: Vertical Identity ───────────────────────────────────────────────

const LICENSES = ['A License', 'B License', 'C License', 'D License', 'Tandem Rating', 'AFF Rating', 'Coach Rating'];
const DISCIPLINES = ['Formation Skydiving', 'Freefly', 'Wingsuit', 'Canopy Piloting', 'CRW', 'Speed Skydiving', 'Artistic Events', 'Tracking / Angle'];

function VerticalIdentityStep({ data = {}, persona, onSubmit, isSubmitting }: StepProps) {
  const [selectedLicense, setSelectedLicense] = useState<string>(data.licenseLevel || '');
  const [selectedDisciplines, setSelectedDisciplines] = useState<string[]>(data.disciplines || []);
  const [memberNumber, setMemberNumber] = useState(data.memberNumber || '');

  const toggleDiscipline = (d: string) => {
    setSelectedDisciplines((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
    );
  };

  const showLicenses = persona !== 'beginner';
  const isValid = persona === 'beginner' || selectedLicense.length > 0;

  return (
    <View style={{ gap: spacing[5] }}>
      <Text style={{ fontSize: typography.fontSize['2xl'], fontWeight: typography.fontWeight.bold, color: colors.text.primary }}>
        {persona === 'beginner' ? 'What interests you?' : 'Your Credentials'}
      </Text>

      {/* License Selection */}
      {showLicenses && (
        <View>
          <Text style={{ fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.semibold, color: colors.text.primary, marginBottom: spacing[3] }}>
            License Level
          </Text>
          <View style={{ gap: spacing[2] }}>
            {LICENSES.map((lic) => {
              const isSelected = selectedLicense === lic;
              return (
                <Pressable
                  key={lic}
                  onPress={() => setSelectedLicense(lic)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: spacing[3.5],
                    borderRadius: radii.lg,
                    borderWidth: 1.5,
                    borderColor: isSelected ? colors.brand.primary : colors.border,
                    backgroundColor: isSelected ? colors.sky[50] : colors.background,
                    gap: spacing[3],
                  }}
                >
                  <View
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      borderWidth: 2,
                      borderColor: isSelected ? colors.brand.primary : colors.gray[300],
                      backgroundColor: isSelected ? colors.brand.primary : 'transparent',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {isSelected && <SLIcon name="check" size="xs" color={colors.text.inverse} />}
                  </View>
                  <Text style={{ fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.medium, color: colors.text.primary }}>
                    {lic}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {/* Disciplines */}
      <View>
        <Text style={{ fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.semibold, color: colors.text.primary, marginBottom: spacing[3] }}>
          {persona === 'beginner' ? 'What excites you?' : 'Disciplines'}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] }}>
          {DISCIPLINES.map((d) => {
            const isSelected = selectedDisciplines.includes(d);
            return (
              <Pressable
                key={d}
                onPress={() => toggleDiscipline(d)}
                style={{
                  paddingHorizontal: spacing[3],
                  paddingVertical: spacing[2],
                  borderRadius: radii.full,
                  backgroundColor: isSelected ? colors.brand.primary : colors.gray[100],
                }}
              >
                <Text
                  style={{
                    fontSize: typography.fontSize.sm,
                    fontWeight: typography.fontWeight.medium,
                    color: isSelected ? colors.text.inverse : colors.text.secondary,
                  }}
                >
                  {d}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Member Number */}
      {showLicenses && (
        <SLInput
          label="USPA Member Number"
          placeholder="e.g. USPA12345"
          value={memberNumber}
          onChangeText={setMemberNumber}
          iconLeft="ticket"
          autoCapitalize="characters"
        />
      )}

      <View style={{ marginTop: spacing[2] }}>
        <SLButton
          label="Continue"
          onPress={() =>
            onSubmit({
              licenseLevel: selectedLicense,
              disciplines: selectedDisciplines,
              memberNumber: memberNumber.trim(),
            })
          }
          size="lg"
          fullWidth
          disabled={!isValid}
          loading={isSubmitting}
          iconRight="arrow-right"
        />
      </View>
    </View>
  );
}

// ─── Step 4: Professional History ────────────────────────────────────────────

function ProfessionalHistoryStep({ data = {}, persona, onSubmit, isSubmitting }: StepProps) {
  const [totalJumps, setTotalJumps] = useState(data.totalJumps || '');
  const [yearsExperience, setYearsExperience] = useState(data.yearsExperience || '');
  const [homeDz, setHomeDz] = useState(data.homeDz || '');
  const [bio, setBio] = useState(data.bio || '');

  const isBeginner = persona === 'beginner';

  return (
    <View style={{ gap: spacing[4] }}>
      <Text style={{ fontSize: typography.fontSize['2xl'], fontWeight: typography.fontWeight.bold, color: colors.text.primary }}>
        {isBeginner ? 'Your Aspirations' : 'Professional History'}
      </Text>

      {!isBeginner && (
        <>
          <SLInput
            label="Total Jumps"
            placeholder="e.g. 250"
            value={totalJumps}
            onChangeText={setTotalJumps}
            keyboardType="number-pad"
            iconLeft="plane"
          />
          <SLInput
            label="Years of Experience"
            placeholder="e.g. 5"
            value={yearsExperience}
            onChangeText={setYearsExperience}
            keyboardType="number-pad"
            iconLeft="clock"
          />
        </>
      )}

      <SLInput
        label={isBeginner ? 'What brought you to skydiving?' : 'Home Dropzone'}
        placeholder={isBeginner ? 'Tell us your story...' : 'e.g. Skydive Dubai'}
        value={homeDz}
        onChangeText={setHomeDz}
        iconLeft="map-pin"
      />

      <View>
        <Text style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium, color: colors.text.secondary, marginBottom: spacing[1] }}>
          {isBeginner ? 'What do you hope to achieve?' : 'Bio / About'}
        </Text>
        <TextInput
          value={bio}
          onChangeText={setBio}
          placeholder={isBeginner ? 'Share your goals and dreams...' : 'Tell us about your skydiving career...'}
          placeholderTextColor={colors.text.tertiary}
          multiline
          numberOfLines={4}
          maxLength={200}
          style={{
            borderWidth: 1.5,
            borderColor: colors.border,
            borderRadius: radii.lg,
            padding: spacing[3],
            fontSize: typography.fontSize.base,
            color: colors.text.primary,
            minHeight: 100,
            textAlignVertical: 'top',
          }}
        />
        <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary, textAlign: 'right', marginTop: spacing[0.5] }}>
          {bio.length}/200
        </Text>
      </View>

      <View style={{ marginTop: spacing[2] }}>
        <SLButton
          label="Continue"
          onPress={() =>
            onSubmit({
              totalJumps: totalJumps ? parseInt(totalJumps, 10) : 0,
              yearsExperience: yearsExperience ? parseInt(yearsExperience, 10) : 0,
              homeDz: homeDz.trim(),
              bio: bio.trim(),
            })
          }
          size="lg"
          fullWidth
          loading={isSubmitting}
          iconRight="arrow-right"
        />
      </View>
    </View>
  );
}

// ─── Step 5: Travel & Booking ────────────────────────────────────────────────

const DZ_TYPES = [
  { key: 'tandem_factory', icon: 'users' as IconName, label: 'Tandem Factory', desc: 'High volume, student focus' },
  { key: 'fun_jumper', icon: 'zap' as IconName, label: 'Fun Jumper Paradise', desc: 'Experienced jumper focus' },
  { key: 'training', icon: 'graduation-cap' as IconName, label: 'Training Academy', desc: 'Structured learning programs' },
  { key: 'boogie', icon: 'trophy' as IconName, label: 'Boogie / Event DZ', desc: 'Festival and event focus' },
];

const TRAVEL_FREQ = ['Every weekend (local)', 'Monthly (regional)', 'Quarterly (national)', 'Annually (international)', 'Digital nomad (full-time)'];

function TravelBookingStep({ data = {}, persona: _persona, onSubmit, isSubmitting }: StepProps) {
  const [dzTypes, setDzTypes] = useState<string[]>(data.dzTypes || []);
  const [travelFreq, setTravelFreq] = useState<string>(data.travelFrequency || '');

  const toggleDzType = (key: string) => {
    setDzTypes((prev) => prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]);
  };

  return (
    <View style={{ gap: spacing[5] }}>
      <Text style={{ fontSize: typography.fontSize['2xl'], fontWeight: typography.fontWeight.bold, color: colors.text.primary }}>
        Preferences
      </Text>

      {/* DZ Type Preference */}
      <View>
        <Text style={{ fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.semibold, color: colors.text.primary, marginBottom: spacing[3] }}>
          Preferred Dropzone Types
        </Text>
        <View style={{ gap: spacing[2] }}>
          {DZ_TYPES.map((dz) => {
            const isSelected = dzTypes.includes(dz.key);
            return (
              <Pressable
                key={dz.key}
                onPress={() => toggleDzType(dz.key)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: spacing[3],
                  borderRadius: radii.lg,
                  borderWidth: 1.5,
                  borderColor: isSelected ? colors.brand.primary : colors.border,
                  backgroundColor: isSelected ? colors.sky[50] : colors.background,
                  gap: spacing[3],
                }}
              >
                <SLIcon name={dz.icon} size="md" color={isSelected ? colors.brand.primary : colors.text.tertiary} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: colors.text.primary }}>{dz.label}</Text>
                  <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary }}>{dz.desc}</Text>
                </View>
                {isSelected && <SLIcon name="check" size="sm" color={colors.brand.primary} />}
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Travel Frequency */}
      <View>
        <Text style={{ fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.semibold, color: colors.text.primary, marginBottom: spacing[3] }}>
          Travel Frequency
        </Text>
        <View style={{ gap: spacing[1.5] }}>
          {TRAVEL_FREQ.map((freq) => {
            const isSelected = travelFreq === freq;
            return (
              <Pressable
                key={freq}
                onPress={() => setTravelFreq(freq)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: spacing[3],
                  paddingHorizontal: spacing[3],
                  borderRadius: radii.md,
                  backgroundColor: isSelected ? colors.sky[50] : 'transparent',
                  gap: spacing[3],
                }}
              >
                <View
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    borderWidth: 2,
                    borderColor: isSelected ? colors.brand.primary : colors.gray[300],
                    backgroundColor: isSelected ? colors.brand.primary : 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {isSelected && <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.text.inverse }} />}
                </View>
                <Text style={{ fontSize: typography.fontSize.sm, color: colors.text.primary }}>{freq}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={{ marginTop: spacing[2] }}>
        <SLButton
          label="Continue"
          onPress={() => onSubmit({ dzTypes, travelFrequency: travelFreq })}
          size="lg"
          fullWidth
          loading={isSubmitting}
          iconRight="arrow-right"
        />
      </View>
    </View>
  );
}

// ─── Step 6: Profile Summary ─────────────────────────────────────────────────

function ProfileSummaryStep({ stepData, persona, onSubmit, isSubmitting }: SummaryStepProps) {
  const info = stepData[1] || {};
  const identity = stepData[3] || {};
  const history = stepData[4] || {};

  const nameParts = (info.fullName || '').split(' ');

  return (
    <View style={{ gap: spacing[5] }}>
      <Text style={{ fontSize: typography.fontSize['2xl'], fontWeight: typography.fontWeight.bold, color: colors.text.primary, textAlign: 'center' }}>
        Profile Preview
      </Text>

      {/* Profile Card */}
      <SLCard padding="lg" shadow="md">
        <View style={{ alignItems: 'center', marginBottom: spacing[4] }}>
          <SLAvatar
            firstName={nameParts[0]}
            lastName={nameParts[1]}
            size="xl"
          />
          <Text style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: colors.text.primary, marginTop: spacing[3] }}>
            {info.fullName || 'Your Name'}
          </Text>
          <SLBadge label={PERSONA_LABELS[persona]} variant="primary" />
        </View>

        {identity.licenseLevel && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginBottom: spacing[2] }}>
            <SLIcon name="shield" size="sm" color={colors.text.tertiary} />
            <Text style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>{identity.licenseLevel}</Text>
          </View>
        )}

        {history.homeDz && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginBottom: spacing[2] }}>
            <SLIcon name="map-pin" size="sm" color={colors.text.tertiary} />
            <Text style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>{history.homeDz}</Text>
          </View>
        )}

        {history.totalJumps > 0 && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginBottom: spacing[2] }}>
            <SLIcon name="plane" size="sm" color={colors.text.tertiary} />
            <Text style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>{history.totalJumps} jumps</Text>
          </View>
        )}

        {identity.disciplines?.length > 0 && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[1.5], marginTop: spacing[2] }}>
            {identity.disciplines.map((d: string) => (
              <SLBadge key={d} label={d} variant="info" size="sm" />
            ))}
          </View>
        )}

        {history.bio && (
          <Text style={{ fontSize: typography.fontSize.sm, color: colors.text.tertiary, marginTop: spacing[3], lineHeight: typography.lineHeight.sm }}>
            {history.bio}
          </Text>
        )}
      </SLCard>

      <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary, textAlign: 'center' }}>
        You can edit your profile anytime after completing onboarding.
      </Text>

      <SLButton
        label="Looks Good — Continue"
        onPress={() => onSubmit({ reviewed: true })}
        size="lg"
        fullWidth
        loading={isSubmitting}
        iconRight="check"
      />
    </View>
  );
}

// ─── Step 7: Complete ────────────────────────────────────────────────────────

function CompleteStep({ persona, onSubmit, isSubmitting }: StepProps) {
  return (
    <View style={{ alignItems: 'center', paddingTop: spacing[10] }}>
      <View
        style={{
          width: 96,
          height: 96,
          borderRadius: 48,
          backgroundColor: colors.tint.success.bg,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: spacing[6],
        }}
      >
        <SLIcon name="check" size="3xl" color={colors.brand.success} />
      </View>

      <Text style={{ fontSize: typography.fontSize['2xl'], fontWeight: typography.fontWeight.bold, color: colors.text.primary, textAlign: 'center', marginBottom: spacing[2] }}>
        Welcome to SkyLara!
      </Text>
      <Text style={{ fontSize: typography.fontSize.base, color: colors.text.secondary, textAlign: 'center', lineHeight: typography.lineHeight.base, maxWidth: 320 }}>
        Your {PERSONA_LABELS[persona]} profile is ready. Explore dropzones, book jumps, and connect with the global skydiving community.
      </Text>

      <View style={{ marginTop: spacing[8], width: '100%' }}>
        <SLButton
          label="Start Exploring"
          onPress={() => onSubmit({ completed: true })}
          size="lg"
          fullWidth
          loading={isSubmitting}
          iconRight="arrow-right"
        />
      </View>
    </View>
  );
}

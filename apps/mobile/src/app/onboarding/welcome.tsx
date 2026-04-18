import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SLButton, SLIcon, SLCard } from '@/components/ui';
import type { IconName } from '@/components/ui/SLIcon';
import { colors, spacing, typography, radii } from '@/theme';
import { useOnboardingStore, PERSONA_LABELS, type Persona } from '@/stores/onboarding';

const PERSONAS: { key: Persona; icon: IconName; description: string }[] = [
  {
    key: 'coach',
    icon: 'shield',
    description: 'Instructors, AFF-I, coaches, and tandem masters',
  },
  {
    key: 'videographer',
    icon: 'camera',
    description: 'Camera flyers and video professionals',
  },
  {
    key: 'tunnel',
    icon: 'wind',
    description: 'Indoor tunnel flyers and bodyflight athletes',
  },
  {
    key: 'beginner',
    icon: 'star',
    description: 'First-time jumpers, tandem students, and newcomers',
  },
  {
    key: 'organizer',
    icon: 'clipboard-list',
    description: 'DZ operators, event organizers, and business owners',
  },
];

const FEATURES: { icon: IconName; title: string; description: string }[] = [
  {
    icon: 'book-open',
    title: 'Smart Logs',
    description: 'Automatically track every jump, canopy flight, and freefall',
  },
  {
    icon: 'globe',
    title: 'Global Tribe',
    description: 'Connect with skydivers, DZs, and events worldwide',
  },
];

export default function OnboardingWelcome() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { persona: savedPersona, setPersona, restore } = useOnboardingStore();
  const [selected, setSelected] = useState<Persona | null>(savedPersona);
  const [resumeAvailable, setResumeAvailable] = useState(false);

  useEffect(() => {
    restore().then((hasState) => {
      if (hasState) {
        setResumeAvailable(true);
        setSelected(useOnboardingStore.getState().persona);
      }
    });
  }, [restore]);

  const handleGetStarted = () => {
    if (!selected) return;
    setPersona(selected);
    router.push('/onboarding/steps');
  };

  const handleResume = () => {
    router.push('/onboarding/steps');
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: spacing[10] }}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero Section */}
      <View
        style={{
          height: 220,
          backgroundColor: colors.sky[900],
          paddingTop: insets.top + spacing[6],
          paddingHorizontal: spacing[6],
          justifyContent: 'center',
        }}
      >
        <Text
          style={{
            fontSize: typography.fontSize['3xl'],
            fontWeight: typography.fontWeight.bold,
            color: colors.text.inverse,
            textAlign: 'center',
            marginBottom: spacing[2],
          }}
        >
          Join the Global{'\n'}Skydiving Network
        </Text>
        <Text
          style={{
            fontSize: typography.fontSize.base,
            color: 'rgba(255,255,255,0.8)',
            textAlign: 'center',
          }}
        >
          Track, connect, and grow your skydiving career
        </Text>
      </View>

      <View style={{ paddingHorizontal: spacing[6], marginTop: -spacing[6] }}>
        {/* Feature Cards */}
        <View style={{ flexDirection: 'row', gap: spacing[3], marginBottom: spacing[6] }}>
          {FEATURES.map((f) => (
            <SLCard key={f.title} padding="md" shadow="md" style={{ flex: 1 }}>
              <SLIcon name={f.icon} size="lg" color={colors.brand.primary} />
              <Text
                style={{
                  fontSize: typography.fontSize.base,
                  fontWeight: typography.fontWeight.semibold,
                  color: colors.text.primary,
                  marginTop: spacing[2],
                  marginBottom: spacing[1],
                }}
              >
                {f.title}
              </Text>
              <Text
                style={{
                  fontSize: typography.fontSize.xs,
                  color: colors.text.tertiary,
                  lineHeight: typography.lineHeight.xs,
                }}
              >
                {f.description}
              </Text>
            </SLCard>
          ))}
        </View>

        {/* Section Title */}
        <Text
          style={{
            fontSize: typography.fontSize.lg,
            fontWeight: typography.fontWeight.bold,
            color: colors.text.primary,
            marginBottom: spacing[3],
          }}
        >
          I am a...
        </Text>

        {/* Persona Selection */}
        <View style={{ gap: spacing[2.5] }}>
          {PERSONAS.map((p) => {
            const isSelected = selected === p.key;
            return (
              <Pressable
                key={p.key}
                onPress={() => setSelected(p.key)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: spacing[4],
                  borderRadius: radii.lg,
                  borderWidth: 1.5,
                  borderColor: isSelected ? colors.brand.primary : colors.border,
                  borderLeftWidth: isSelected ? 3 : 1.5,
                  borderLeftColor: isSelected ? colors.brand.primary : colors.border,
                  backgroundColor: isSelected ? colors.sky[50] : colors.background,
                  gap: spacing[3],
                }}
              >
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: isSelected ? colors.sky[100] : colors.gray[100],
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <SLIcon
                    name={p.icon}
                    size="md"
                    color={isSelected ? colors.brand.primary : colors.text.secondary}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: typography.fontSize.base,
                      fontWeight: typography.fontWeight.semibold,
                      color: colors.text.primary,
                    }}
                  >
                    {PERSONA_LABELS[p.key]}
                  </Text>
                  <Text
                    style={{
                      fontSize: typography.fontSize.xs,
                      color: colors.text.tertiary,
                      marginTop: 2,
                    }}
                  >
                    {p.description}
                  </Text>
                </View>

                {isSelected && (
                  <SLIcon name="check" size="md" color={colors.brand.primary} />
                )}
              </Pressable>
            );
          })}
        </View>

        {/* Resume Banner */}
        {resumeAvailable && (
          <Pressable
            onPress={handleResume}
            style={{
              marginTop: spacing[4],
              padding: spacing[3],
              borderRadius: radii.lg,
              backgroundColor: colors.tint.warning.bg,
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing[2],
            }}
          >
            <SLIcon name="refresh" size="sm" color={colors.tint.warning.text} />
            <Text style={{ flex: 1, fontSize: typography.fontSize.sm, color: colors.tint.warning.text, fontWeight: typography.fontWeight.medium }}>
              You have an unfinished onboarding. Tap to resume.
            </Text>
            <SLIcon name="chevron-right" size="sm" color={colors.tint.warning.text} />
          </Pressable>
        )}

        {/* CTA */}
        <View style={{ marginTop: spacing[6] }}>
          <SLButton
            label="Get Started"
            onPress={handleGetStarted}
            size="lg"
            fullWidth
            disabled={!selected}
            iconRight="arrow-right"
          />
        </View>
      </View>
    </ScrollView>
  );
}

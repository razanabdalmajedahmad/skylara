import React, { type ReactNode, useCallback, useState } from 'react';
import { ScrollView, View, RefreshControl, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/theme';
import { SLHeader } from '@/components/ui';
import type { IconName } from '@/components/ui/SLIcon';
import ErrorBoundary from './ErrorBoundary';

interface ScreenWrapperProps {
  children: ReactNode;
  /** Header title — if omitted, no header is rendered */
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  onBackPress?: () => void;
  rightIcon?: IconName;
  onRightPress?: () => void;
  rightElement?: ReactNode;
  /** Pull-to-refresh callback. If provided, enables pull-to-refresh. */
  onRefresh?: () => Promise<void>;
  /** Use ScrollView (default true). Set false for FlatList-based screens. */
  scrollable?: boolean;
  /** Disable SafeArea (for screens that handle it themselves) */
  noSafeArea?: boolean;
  /** Background color */
  backgroundColor?: string;
}

export default function ScreenWrapper({
  children,
  title,
  subtitle,
  showBack = false,
  onBackPress,
  rightIcon,
  onRightPress,
  rightElement,
  onRefresh,
  scrollable = true,
  noSafeArea = false,
  backgroundColor = colors.background,
}: ScreenWrapperProps) {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    if (!onRefresh) return;
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh]);

  const content = (
    <ErrorBoundary>
      {title && (
        <SLHeader
          title={title}
          subtitle={subtitle}
          showBack={showBack}
          onBackPress={onBackPress}
          rightIcon={rightIcon}
          onRightPress={onRightPress}
          rightElement={rightElement}
        />
      )}

      {scrollable ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          {...(onRefresh && Platform.OS !== 'web'
            ? {
                refreshControl: (
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={handleRefresh}
                    tintColor={colors.brand.primary}
                    colors={[colors.brand.primary]}
                  />
                ),
              }
            : {})}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>{children}</View>
      )}
    </ErrorBoundary>
  );

  if (noSafeArea) {
    return (
      <View style={{ flex: 1, backgroundColor }}>
        {content}
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor }} edges={title ? ['bottom'] : ['top', 'bottom']}>
      {content}
    </SafeAreaView>
  );
}

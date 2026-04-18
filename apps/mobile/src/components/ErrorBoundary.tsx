import React, { Component, type ReactNode } from 'react';
import { View, Text, Pressable } from 'react-native';
import { colors, spacing, typography, radii } from '@/theme';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to error reporting service in production
    console.error('[ErrorBoundary] Caught error:', error.message);
    console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            padding: spacing[6],
            backgroundColor: colors.background,
          }}
        >
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: '#FEE2E2',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: spacing[4],
            }}
          >
            <Text style={{ fontSize: 28 }}>!</Text>
          </View>

          <Text
            style={{
              fontSize: typography.fontSize.xl,
              fontWeight: typography.fontWeight.bold,
              color: colors.text.primary,
              textAlign: 'center',
              marginBottom: spacing[2],
            }}
          >
            Something went wrong
          </Text>

          <Text
            style={{
              fontSize: typography.fontSize.sm,
              color: colors.text.tertiary,
              textAlign: 'center',
              marginBottom: spacing[6],
              maxWidth: 300,
            }}
          >
            An unexpected error occurred. Please try again.
          </Text>

          {__DEV__ && this.state.error && (
            <View
              style={{
                backgroundColor: colors.gray[50],
                padding: spacing[3],
                borderRadius: radii.md,
                marginBottom: spacing[4],
                maxWidth: '100%',
              }}
            >
              <Text
                style={{
                  fontSize: typography.fontSize.xs,
                  color: colors.brand.danger,
                  fontFamily: 'monospace',
                }}
                numberOfLines={5}
              >
                {this.state.error.message}
              </Text>
            </View>
          )}

          <Pressable
            onPress={this.handleRetry}
            style={({ pressed }) => ({
              backgroundColor: pressed ? colors.sky[600] : colors.brand.primary,
              paddingHorizontal: spacing[6],
              paddingVertical: spacing[3],
              borderRadius: radii.lg,
            })}
          >
            <Text
              style={{
                color: colors.text.inverse,
                fontSize: typography.fontSize.base,
                fontWeight: typography.fontWeight.semibold,
              }}
            >
              Try Again
            </Text>
          </Pressable>
        </View>
      );
    }

    return this.props.children;
  }
}

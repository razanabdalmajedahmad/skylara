import React from 'react';
import { Platform, RefreshControl, RefreshControlProps } from 'react-native';

/**
 * Cross-platform RefreshControl wrapper.
 * Returns a real RefreshControl on native, null on web (where pull-to-refresh is not supported).
 */
export function createRefreshControl(props: RefreshControlProps): React.ReactElement | undefined {
  if (Platform.OS === 'web') return undefined;
  return <RefreshControl {...props} />;
}

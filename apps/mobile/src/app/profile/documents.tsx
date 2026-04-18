import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '@/lib/api';
import { SLIcon, SLButton, SLCard, SLBadge, SLEmptyState } from '@/components/ui';
import { SLSkeleton } from '@/components/ui';
import type { IconName } from '@/components/ui/SLIcon';
import { colors, spacing, typography } from '@/theme';

const DOCUMENT_TYPES = [
  { label: 'License Card Photo', value: 'LICENSE_CARD', icon: 'credit-card' as IconName },
  { label: 'USPA Card', value: 'USPA_CARD', icon: 'award' as IconName },
  { label: 'Passport', value: 'PASSPORT', icon: 'globe' as IconName },
  { label: 'Medical Certificate', value: 'MEDICAL_CERT', icon: 'heart' as IconName },
  { label: 'Insurance', value: 'INSURANCE', icon: 'shield' as IconName },
  { label: 'Other', value: 'OTHER', icon: 'file' as IconName },
];

interface Document {
  id: number;
  type: string;
  url?: string;
  uploadedAt: string;
  status: 'verified' | 'pending' | 'expired';
  expiryDate?: string;
}

function getStatusVariant(status: string): 'success' | 'warning' | 'danger' | 'info' {
  switch (status) {
    case 'verified': return 'success';
    case 'pending': return 'warning';
    case 'expired': return 'danger';
    default: return 'info';
  }
}

export default function DocumentsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showTypePicker, setShowTypePicker] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    setIsLoading(true);
    try {
      const { data } = await api.get('/jumpers/me/documents');
      setDocuments(data || []);
    } catch {
      Alert.alert('Error', 'Failed to load documents');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpload = (_type: string) => {
    setShowTypePicker(false);
    Alert.alert(
      'Coming Soon',
      'Document upload via camera/gallery will be available soon with S3 storage.'
    );
  };

  const handleDelete = (docId: number) => {
    Alert.alert('Delete Document', 'Are you sure you want to delete this document?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/jumpers/me/documents/${docId}`);
            setDocuments((prev) => prev.filter((d) => d.id !== docId));
            Alert.alert('Success', 'Document deleted');
          } catch {
            Alert.alert('Error', 'Failed to delete document');
          }
        },
      },
    ]);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

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
            My Documents
          </Text>
          <Pressable
            onPress={() => setShowTypePicker(true)}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <SLIcon name="plus" size="lg" color={colors.brand.primary} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: spacing[6], paddingBottom: spacing[12] }}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <View style={{ gap: spacing[3] }}>
            <SLSkeleton width="100%" height={120} />
            <SLSkeleton width="100%" height={120} />
            <SLSkeleton width="100%" height={120} />
          </View>
        ) : documents.length === 0 ? (
          <SLEmptyState
            icon="file"
            title="No Documents Yet"
            description="Upload your documents to complete your profile"
            actionLabel="Upload Document"
            onAction={() => setShowTypePicker(true)}
          />
        ) : (
          <View style={{ gap: spacing[3] }}>
            {documents.map((doc) => {
              const typeInfo = DOCUMENT_TYPES.find((t) => t.value === doc.type);
              return (
                <SLCard key={doc.id} padding="lg" shadow="sm">
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: spacing[3] }}>
                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing[3] }}>
                      <View
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 8,
                          backgroundColor: colors.sky[50],
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <SLIcon name={typeInfo?.icon || 'file'} size="md" color={colors.brand.primary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.bold, color: colors.text.primary }}>
                          {typeInfo?.label || doc.type}
                        </Text>
                        <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary, marginTop: 2 }}>
                          Uploaded: {formatDate(doc.uploadedAt)}
                        </Text>
                      </View>
                    </View>
                    <SLBadge label={doc.status} variant={getStatusVariant(doc.status)} />
                  </View>

                  {doc.expiryDate && (
                    <Text style={{ fontSize: typography.fontSize.xs, color: colors.text.tertiary, marginBottom: spacing[3] }}>
                      Expires: {formatDate(doc.expiryDate)}
                    </Text>
                  )}

                  <View style={{ flexDirection: 'row', gap: spacing[2] }}>
                    {doc.url && (
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
                    <View style={{ flex: 1 }}>
                      <SLButton
                        label="Delete"
                        onPress={() => handleDelete(doc.id)}
                        variant="danger"
                        size="sm"
                        fullWidth
                        iconLeft="trash"
                      />
                    </View>
                  </View>
                </SLCard>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Document Type Picker Modal */}
      <Modal
        visible={showTypePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTypePicker(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
          onPress={() => setShowTypePicker(false)}
        >
          <Pressable
            style={{
              backgroundColor: colors.surface,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              overflow: 'hidden',
            }}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={{ paddingHorizontal: spacing[6], paddingTop: spacing[4], paddingBottom: spacing[4], borderBottomWidth: 1, borderBottomColor: colors.border, alignItems: 'center' }}>
              <View style={{ width: 48, height: 4, backgroundColor: colors.gray[300], borderRadius: 2, marginBottom: spacing[4] }} />
              <Text style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, color: colors.text.primary }}>
                Select Document Type
              </Text>
            </View>

            <FlatList
              data={DOCUMENT_TYPES}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => handleUpload(item.value)}
                  style={({ pressed }) => ({
                    paddingHorizontal: spacing[6],
                    paddingVertical: spacing[4],
                    borderBottomWidth: 1,
                    borderBottomColor: colors.gray[100],
                    backgroundColor: pressed ? colors.gray[50] : colors.surface,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing[3],
                  })}
                >
                  <SLIcon name={item.icon} size="md" color={colors.brand.primary} />
                  <Text style={{ fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.semibold, color: colors.text.primary }}>
                    {item.label}
                  </Text>
                </Pressable>
              )}
              keyExtractor={(item) => item.value}
            />

            <View style={{ paddingHorizontal: spacing[6], paddingVertical: spacing[4], backgroundColor: colors.gray[50] }}>
              <SLButton
                label="Cancel"
                onPress={() => setShowTypePicker(false)}
                variant="ghost"
                fullWidth
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

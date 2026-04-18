import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  FlatList,
  TextInput,
} from 'react-native';

const FORMATIONS = [
  'FS',
  'Freefly',
  'Solo',
  'Wingsuit',
  'XRW',
  'VFS',
  'HopNPop',
  'Tracking',
  'CRW',
  'Canopy Flocking',
  'Angle',
  'Freestyle',
  'High Pull',
  'HyBrid',
  'FS-4WAY',
  'FS-8WAY',
  'FS-16WAY',
  'FS-BigWay',
  'AFF',
  'Tandem',
  'SWOOP',
  'POND SWOOP',
  'MFS',
  'Accuracy',
  'Sky Surfing',
];

interface FormationPickerProps {
  visible: boolean;
  selected: string;
  onSelect: (formation: string) => void;
  onClose: () => void;
}

export default function FormationPicker({
  visible,
  selected,
  onSelect,
  onClose,
}: FormationPickerProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredFormations = useMemo(() => {
    if (!searchTerm) return FORMATIONS;
    return FORMATIONS.filter((f) =>
      f.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm]);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View className="flex-1 bg-black/50">
        <View className="flex-1 bg-white mt-12 rounded-t-3xl overflow-hidden">
          {/* Header */}
          <View className="px-4 py-4 border-b border-gray-200">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-lg font-bold text-gray-900">Select Formation</Text>
              <Pressable onPress={onClose} className="p-2">
                <Text className="text-lg text-gray-500">✕</Text>
              </Pressable>
            </View>

            {/* Search */}
            <TextInput
              placeholder="Search formations..."
              value={searchTerm}
              onChangeText={setSearchTerm}
              className="border border-gray-300 rounded-lg px-3 py-2 bg-gray-50"
            />
          </View>

          {/* List */}
          <FlatList
            data={filteredFormations}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => onSelect(item)}
                className={`flex-row items-center px-4 py-3 border-b border-gray-100 ${
                  item === selected ? 'bg-blue-50' : 'bg-white'
                }`}
              >
                <Text
                  className={`flex-1 text-base ${
                    item === selected
                      ? 'font-bold text-blue-600'
                      : 'font-medium text-gray-900'
                  }`}
                >
                  {item}
                </Text>
                {item === selected && (
                  <View className="w-5 h-5 rounded-full bg-blue-500 items-center justify-center">
                    <Text className="text-white text-xs font-bold">✓</Text>
                  </View>
                )}
              </Pressable>
            )}
          />

          {/* Confirm Button */}
          <View className="px-4 py-4 border-t border-gray-200">
            <Pressable
              onPress={onClose}
              className="bg-blue-500 py-3 rounded-lg items-center"
            >
              <Text className="text-white font-bold">Confirm</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

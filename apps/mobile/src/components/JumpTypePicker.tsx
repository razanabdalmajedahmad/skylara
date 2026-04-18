import React from 'react';
import { View, Text, Pressable, FlatList } from 'react-native';

interface JumpType {
  id: string;
  name: string;
  price: number;
}

interface JumpTypePickerProps {
  selected: string;
  onSelect: (typeId: string) => void;
  jumpTypes: JumpType[];
}

export default function JumpTypePicker({
  selected,
  onSelect,
  jumpTypes,
}: JumpTypePickerProps) {
  return (
    <FlatList
      data={jumpTypes}
      keyExtractor={(item) => item.id}
      scrollEnabled={false}
      renderItem={({ item }) => (
        <Pressable
          onPress={() => onSelect(item.id)}
          className={`p-4 mb-3 rounded-lg border-2 flex-row items-center justify-between ${
            selected === item.id
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 bg-white'
          }`}
        >
          <View className="flex-1">
            <Text
              className={`text-base font-semibold mb-1 ${
                selected === item.id ? 'text-blue-600' : 'text-gray-900'
              }`}
            >
              {item.name}
            </Text>
            <Text className="text-sm text-gray-500">${item.price}</Text>
          </View>

          {/* Radio Button */}
          <View
            className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
              selected === item.id
                ? 'border-blue-500 bg-blue-500'
                : 'border-gray-300'
            }`}
          >
            {selected === item.id && (
              <View className="w-2 h-2 rounded-full bg-white" />
            )}
          </View>
        </Pressable>
      )}
    />
  );
}

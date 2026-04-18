import React from 'react';
import { View, Text, Pressable } from 'react-native';

type PaymentMethod = 'BLOCK_TICKET' | 'WALLET' | 'CARD';

interface PaymentMethodPickerProps {
  selected: PaymentMethod;
  onSelect: (method: PaymentMethod) => void;
}

export default function PaymentMethodPicker({
  selected,
  onSelect,
}: PaymentMethodPickerProps) {
  const methods = [
    {
      id: 'BLOCK_TICKET' as const,
      name: 'Block Ticket',
      description: '5 remaining',
      available: true,
    },
    {
      id: 'WALLET' as const,
      name: 'Wallet',
      description: '$150.00 available',
      available: true,
    },
    {
      id: 'CARD' as const,
      name: 'Credit Card',
      description: 'Visa ending in 4242',
      available: true,
    },
  ];

  return (
    <View className="gap-3">
      {methods.map((method) => (
        <Pressable
          key={method.id}
          onPress={() => onSelect(method.id)}
          disabled={!method.available}
          className={`p-4 rounded-lg border-2 flex-row items-center justify-between ${
            selected === method.id
              ? 'border-blue-500 bg-blue-50'
              : method.available
                ? 'border-gray-200 bg-white'
                : 'border-gray-100 bg-gray-50'
          } ${!method.available ? 'opacity-50' : ''}`}
        >
          <View className="flex-1">
            <Text
              className={`text-base font-semibold mb-1 ${
                selected === method.id ? 'text-blue-600' : 'text-gray-900'
              }`}
            >
              {method.name}
            </Text>
            <Text className={`text-sm ${
              selected === method.id ? 'text-blue-500' : 'text-gray-500'
            }`}>
              {method.description}
            </Text>
          </View>

          {/* Radio Button */}
          <View
            className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
              selected === method.id
                ? 'border-blue-500 bg-blue-500'
                : 'border-gray-300'
            }`}
          >
            {selected === method.id && (
              <View className="w-2 h-2 rounded-full bg-white" />
            )}
          </View>
        </Pressable>
      ))}

      {selected === 'WALLET' && (
        <View className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <Text className="text-xs text-amber-700">
            Your wallet balance is $150.00. You have sufficient funds for any altitude package.
          </Text>
        </View>
      )}

      {selected === 'BLOCK_TICKET' && (
        <View className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
          <Text className="text-xs text-green-700">
            Block tickets are pre-selected. You have 5 remaining jumps on your current block.
          </Text>
        </View>
      )}
    </View>
  );
}

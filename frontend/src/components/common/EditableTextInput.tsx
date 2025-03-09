import React from 'react';
import { TextInput as RNTextInput, View, StyleSheet } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

interface EditableTextInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  keyboardType?: 'default' | 'numeric';
  style?: any;
  mode?: 'flat' | 'outlined';
}

const EditableTextInput: React.FC<EditableTextInputProps> = ({
  label,
  value,
  onChangeText,
  keyboardType = 'default',
  style,
  mode = 'outlined',
}) => {
  const theme = useTheme();

  return (
    <View style={[styles.container, style]}>
      <Text style={[styles.label, { color: theme.colors.primary }]}>{label}</Text>
      <RNTextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        style={[
          styles.input,
          {
            borderColor: theme.colors.primary,
            backgroundColor: theme.colors.background,
            color: theme.colors.onBackground,
          },
          mode === 'outlined' && styles.outlined,
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    marginBottom: 4,
  },
  input: {
    height: 48,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 4,
    fontSize: 16,
  },
  outlined: {
    borderWidth: 1,
  },
});

export default EditableTextInput;
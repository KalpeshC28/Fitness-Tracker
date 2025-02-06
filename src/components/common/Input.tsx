import React from 'react';
import { TextInput, TextInputProps } from 'react-native-paper';
import { StyleSheet } from 'react-native';

interface CustomInputProps extends TextInputProps {
  error?: boolean;
}

export const Input: React.FC<CustomInputProps> = ({ style, ...props }) => {
  return (
    <TextInput
      mode="outlined"
      style={[styles.input, style]}
      {...props}
    />
  );
};

const styles = StyleSheet.create({
  input: {
    marginVertical: 8,
    backgroundColor: '#fff',
  },
}); 
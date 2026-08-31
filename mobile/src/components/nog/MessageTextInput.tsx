import { StyleSheet, TextInput, type TextInputProps } from 'react-native';

import { Fonts, Palette } from '@/constants/theme';

type MessageTextInputProps = TextInputProps & {
  value: string;
  onChangeText: (text: string) => void;
};

export function MessageTextInput({ value, onChangeText, ...props }: MessageTextInputProps) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder="Pergunte sobre seu carro..."
      placeholderTextColor={Palette.textSoft}
      multiline
      textAlignVertical="top"
      style={styles.input}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    flex: 1,
    minHeight: 36,
    maxHeight: 120,
    color: Palette.text,
    fontSize: 15,
    fontFamily: Fonts.sans,
    paddingTop: 8,
    paddingBottom: 8,
    lineHeight: 20,
  },
});

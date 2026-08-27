import { StyleSheet, TextInput, type TextInputProps } from 'react-native';

import { Fonts, Palette, Radius, Spacing } from '@/constants/theme';

type MessageTextInputProps = TextInputProps & {
  value: string;
  onChangeText: (text: string) => void;
};

export function MessageTextInput({ value, onChangeText, ...props }: MessageTextInputProps) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder="Digite sua pergunta..."
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
    minHeight: 44,
    maxHeight: 132,
    borderRadius: Radius.md,
    color: Palette.text,
    fontSize: 16,
    fontFamily: Fonts.sans,
    paddingTop: 12,
    paddingBottom: 12,
    paddingHorizontal: Spacing.two,
    lineHeight: 21,
  },
});

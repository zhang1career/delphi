import { Text, TextInput, View, type TextInputProps } from "react-native";

type Props = TextInputProps & {
  label: string;
};

export function TextField({ label, className, ...rest }: Props) {
  return (
    <View className={`mb-3 ${className ?? ""}`}>
      <Text className="text-slate-400 text-xs mb-1">{label}</Text>
      <TextInput
        className="bg-surface-card border border-surface-border rounded-xl px-3 py-3 text-slate-100"
        placeholderTextColor="#64748b"
        {...rest}
      />
    </View>
  );
}

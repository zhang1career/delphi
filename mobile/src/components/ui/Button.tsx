import { Pressable, Text, type PressableProps } from "react-native";

type Props = PressableProps & {
  title: string;
  variant?: "primary" | "ghost";
};

export function Button({ title, variant = "primary", className, ...rest }: Props) {
  const base =
    variant === "primary"
      ? "bg-brand active:opacity-90 py-3 px-4 rounded-xl items-center"
      : "bg-transparent border border-surface-border py-3 px-4 rounded-xl items-center";
  return (
    <Pressable className={`${base} ${className ?? ""}`} {...rest}>
      <Text
        className={
          variant === "primary" ? "text-white font-semibold" : "text-slate-200 font-medium"
        }
      >
        {title}
      </Text>
    </Pressable>
  );
}

import { Modal, Pressable, Text, View } from "react-native";

type Props = {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
};

export function AppModal({ visible, title, onClose, children }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        className="flex-1 bg-black/60 justify-center px-6"
        onPress={onClose}
      >
        <Pressable
          className="bg-surface-card rounded-2xl border border-surface-border p-5"
          onPress={(e) => e.stopPropagation()}
        >
          <Text className="text-slate-100 text-lg font-semibold mb-3">{title}</Text>
          {children}
          <Pressable className="mt-4 self-end" onPress={onClose}>
            <Text className="text-brand">Close</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

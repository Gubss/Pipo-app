import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Tabs } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import Mascot from '@/components/Mascot';
import { tap } from '@/components/ui';
import { colors, fonts, shadow } from '@/lib/theme';

function PipoTabButton() {
  return (
    <View style={styles.pipoSlot}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Falar com o Pipo"
        onPress={() => {
          tap();
          router.push('/chat');
        }}
        style={({ pressed }) => [styles.pipoBtn, pressed && { transform: [{ scale: 0.95 }] }]}>
        <Mascot mood="happy" size={58} animated={false} />
      </Pressable>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primaryDark,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarStyle: { backgroundColor: colors.white, borderTopColor: colors.border, height: 68, paddingTop: 6 },
        tabBarLabelStyle: { fontFamily: fonts.bodyBold, fontSize: 12 },
        sceneStyle: { backgroundColor: colors.bg },
      }}>
      <Tabs.Screen
        name="index"
        options={{ title: 'Início', tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color as string} size={size} /> }}
      />
      <Tabs.Screen
        name="agenda"
        options={{ title: 'Agenda', tabBarIcon: ({ color, size }) => <Ionicons name="calendar" color={color as string} size={size} /> }}
      />
      <Tabs.Screen name="pipo" options={{ title: 'Pipo', tabBarButton: () => <PipoTabButton /> }} />
      <Tabs.Screen
        name="habits"
        options={{ title: 'Rotina', tabBarIcon: ({ color, size }) => <Ionicons name="repeat" color={color as string} size={size} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Perfil', tabBarIcon: ({ color, size }) => <Ionicons name="person-circle" color={color as string} size={size} /> }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  pipoSlot: { flex: 1, alignItems: 'center' },
  pipoBtn: {
    marginTop: -26,
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primarySoft,
    borderWidth: 4,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
  },
});

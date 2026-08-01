import { useEffect } from 'react'
import { View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Tabs } from 'expo-router'
import { Line, Path, Polyline, Rect } from 'react-native-svg'
import Svg from 'react-native-svg'
import type { ColorValue } from 'react-native'
import { Colors } from '../../constants/colors'
import SyncBanner from '../../components/SyncBanner'

const IconTaches = ({ color }: { color: ColorValue }) => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Rect x="4" y="3" width="12" height="16" rx="2" stroke={color} strokeWidth={1.6} />
    <Line x1="7" y1="8" x2="13" y2="8" stroke={color} strokeWidth={1.4} strokeLinecap="round" />
    <Line x1="7" y1="11" x2="13" y2="11" stroke={color} strokeWidth={1.4} strokeLinecap="round" />
    <Line x1="7" y1="14" x2="10" y2="14" stroke={color} strokeWidth={1.4} strokeLinecap="round" />
    <Path d="M14 17l5-5 1.5 1.5-5 5H14v-1.5z" stroke={color} strokeWidth={1.4} strokeLinejoin="round" />
  </Svg>
)

const IconRyanEnd = ({ color }: { color: ColorValue }) => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path d="M9 3h6l1 2H8L9 3z" stroke={color} strokeWidth={1.6} strokeLinejoin="round" />
    <Path d="M4 5h16l-1.5 13a2 2 0 01-2 1.5h-9A2 2 0 015.5 18L4 5z" stroke={color} strokeWidth={1.6} strokeLinejoin="round" />
    <Path d="M12 9l.5 1.5H14l-1.2.9.4 1.6L12 12l-1.2 1 .4-1.6L10 10.5h1.5z" stroke={color} strokeWidth={1.1} strokeLinejoin="round" />
  </Svg>
)

const IconRyanProg = ({ color }: { color: ColorValue }) => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" stroke={color} strokeWidth={1.6} strokeLinejoin="round" />
    <Line x1="3" y1="6" x2="21" y2="6" stroke={color} strokeWidth={1.6} />
    <Path d="M16 10a4 4 0 01-8 0" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
  </Svg>
)

const IconStats = ({ color }: { color: ColorValue }) => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Polyline points="3,17 7,13 11,15 16,9 21,5" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    <Polyline points="17,5 21,5 21,9" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
)

export default function TabsLayout() {
  const insets = useSafeAreaInsets()

  return (
    <View style={{ flex: 1 }}>

      {/* Bannière sync — flotte au-dessus de tout */}
      <SyncBanner />

      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: '#0F172A',
            borderTopColor: 'rgba(255,255,255,0.08)',
            borderTopWidth: 1,
            height: 110,
            paddingBottom: 50,
            paddingTop: 8,
            elevation: 20,
          },
          tabBarActiveTintColor: '#06B6D4',
          tabBarInactiveTintColor: '#64748B',
          tabBarLabelStyle: {
            fontSize: 9,
            fontWeight: '600',
            letterSpacing: 0.3,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Tâches',
            tabBarIcon: ({ color }) => <IconTaches color={color} />,
          }}
        />
        <Tabs.Screen
          name="ryan-end"
          options={{
            title: 'Ryan-End',
            tabBarIcon: ({ color }) => <IconRyanEnd color={color} />,
          }}
        />
        <Tabs.Screen
          name="ryan-prog"
          options={{
            title: 'Ryan-Prog',
            tabBarIcon: ({ color }) => <IconRyanProg color={color} />,
          }}
        />
        <Tabs.Screen
          name="stats"
          options={{
            title: 'Stats',
            tabBarIcon: ({ color }) => <IconStats color={color} />,
          }}
        />
      </Tabs>
    </View>
  )
}
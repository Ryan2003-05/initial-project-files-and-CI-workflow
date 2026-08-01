import { jest } from '@jest/globals'
import 'react-native-gesture-handler/jestSetup'

jest.mock('expo-router', () => ({
  Tabs: 'Tabs',
  Stack: 'Stack',
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}))

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}))

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}))

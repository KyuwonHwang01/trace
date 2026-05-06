import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@trace/onboardedDate';

function todayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
}

export async function isOnboarded(): Promise<boolean> {
  const stored = await AsyncStorage.getItem(KEY);
  return stored === todayString();
}

export async function setOnboarded(): Promise<void> {
  await AsyncStorage.setItem(KEY, todayString());
}

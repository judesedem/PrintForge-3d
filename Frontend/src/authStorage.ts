import * as SecureStore from 'expo-secure-store';

// SecureStore uses Keychain on iOS and encrypted SharedPreferences on
// Android — appropriate for a JWT, unlike AsyncStorage which is plaintext.
const TOKEN_KEY = 'printforge_jwt';

export async function getStoredToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setStoredToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearStoredToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

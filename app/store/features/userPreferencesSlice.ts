import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface UserPreferencesState {
  themeMode: ThemeMode;
  // Add other user preferences here as needed
}

const initialState: UserPreferencesState = {
  themeMode: 'light', // Force light mode only
};

export const userPreferencesSlice = createSlice({
  name: 'userPreferences',
  initialState,
  reducers: {
    setThemeMode: (state, action: PayloadAction<ThemeMode>) => {
      state.themeMode = action.payload;
    },
    // Add other reducers for user preferences as needed
  },
});

// Export actions
export const { setThemeMode } = userPreferencesSlice.actions;

// Export reducer
export default userPreferencesSlice.reducer; 
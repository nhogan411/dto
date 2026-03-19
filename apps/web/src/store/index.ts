import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import notificationReducer from './slices/notificationSlice';
import friendsReducer from './slices/friendsSlice';
import gameReducer from './slices/gameSlice';
import dashboardReducer from './slices/dashboardSlice';
import playerCharactersReducer from './slices/playerCharactersSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    notifications: notificationReducer,
    friends: friendsReducer,
    game: gameReducer,
    dashboard: dashboardReducer,
    playerCharacters: playerCharactersReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

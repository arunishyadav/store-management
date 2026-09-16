import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

const useAuthStore = create(
  persist(
    (set) => ({
      token: null,
      user: null,
      selectedLocation: null,
      login: (token, user) => set({ token, user }),
      logout: () => set({ token: null, user: null, selectedLocation: null }),
      updateLocation: (locationObj) =>
        set((state) => ({ selectedLocation: locationObj, user: { ...state.user, location: locationObj?.name } })),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);

export default useAuthStore;

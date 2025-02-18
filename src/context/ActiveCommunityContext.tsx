import React, { createContext, useState, useContext } from 'react';

type ActiveCommunityContextType = {
  activeCommunityId: string | null;
  setActiveCommunityId: (id: string | null) => void;
};

const ActiveCommunityContext = createContext<ActiveCommunityContextType | undefined>(undefined);

export function ActiveCommunityProvider({ children }: { children: React.ReactNode }) {
  const [activeCommunityId, setActiveCommunityId] = useState<string | null>(null);

  return (
    <ActiveCommunityContext.Provider value={{ activeCommunityId, setActiveCommunityId }}>
      {children}
    </ActiveCommunityContext.Provider>
  );
}

export function useActiveCommunity() {
  const context = useContext(ActiveCommunityContext);
  if (context === undefined) {
    throw new Error('useActiveCommunity must be used within an ActiveCommunityProvider');
  }
  return context;
} 
import React, { createContext, useContext } from 'react';

const SwiperIndexContext = createContext<number>(0);

interface ProviderProps {
  value: number;
  children: React.ReactNode;
}

export const SwiperIndexProvider: React.FC<ProviderProps> = ({ value, children }) => {
  return (
    <SwiperIndexContext.Provider value={value}>{children}</SwiperIndexContext.Provider>
  );
};

export const useSwiperIndex = (): number => {
  return useContext(SwiperIndexContext);
};

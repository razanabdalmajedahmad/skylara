'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface AssistantContextType {
  isOpen: boolean;
  openAssistant: (query?: string) => void;
  closeAssistant: () => void;
  initialQuery?: string;
}

const AssistantContext = createContext<AssistantContextType | undefined>(undefined);

export function AssistantProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [initialQuery, setInitialQuery] = useState<string | undefined>(undefined);

  const openAssistant = (query?: string) => {
    setInitialQuery(query);
    setIsOpen(true);
  };

  const closeAssistant = () => {
    setIsOpen(false);
    setInitialQuery(undefined);
  };

  return (
    <AssistantContext.Provider value={{ isOpen, openAssistant, closeAssistant, initialQuery }}>
      {children}
    </AssistantContext.Provider>
  );
}

export function useAssistantModal() {
  const context = useContext(AssistantContext);
  if (!context) {
    throw new Error('useAssistantModal must be used within AssistantProvider');
  }
  return context;
}

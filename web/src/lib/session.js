import { createContext, useContext } from 'react';

// The signed-in account ({ uid, name, email, role }); provided once by App.
export const SessionContext = createContext(null);

export function useSession() {
  return useContext(SessionContext);
}

import { createContext } from 'react';

export interface NestedBlockContextValue {
  isNested: boolean;
  isCover: boolean;
}

export const NestedBlockContext = createContext<NestedBlockContextValue>({
  isNested: false,
  isCover: false,
});

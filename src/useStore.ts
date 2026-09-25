import { useContext } from "react";
import { StoreContext } from "./store-context";

export function useStore() {
  const value = useContext(StoreContext);
  if (!value) throw new Error("StoreProvider 尚未掛載");
  return value;
}

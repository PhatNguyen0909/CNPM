import { createContext } from "react";
import { food_list } from "../assets/assets";

// Tạo context
export const StoreContext = createContext(null);

const StoreContextProvider = (props) => {
  const contextValue = {
    food_list
  }

  return (
    <StoreContext.Provider value={contextValue}>
      {props.children}
    </StoreContext.Provider>
  )
}

// Xuất default để import trong main.jsx
export default StoreContextProvider;

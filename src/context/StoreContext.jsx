import { createContext } from "react";
import { food_list } from "../assets/assets";

export const StoreContext =createContext(null)

const StoreContextProvide = (props) => {
    const contextValue ={
        food_list
    }
    return
    (
        <StoreContextProvide value ={contextValue}>
            {props.children}
        </StoreContextProvide>
    )
}
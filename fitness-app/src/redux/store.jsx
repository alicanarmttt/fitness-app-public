import { configureStore } from "@reduxjs/toolkit";
import programReducer from "../redux/slices/programSlice";
import authReducer from "./slices/authSlice";

export const store = configureStore({
  reducer: { program: programReducer, auth: authReducer },
});

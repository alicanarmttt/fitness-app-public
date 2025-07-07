import { configureStore } from "@reduxjs/toolkit";
import programReducer from "../redux/slices/programSlice";

export const store = configureStore({
  reducer: { program: programReducer },
});

import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

const API_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

// Başlangıç state'i. Token'ı tarayıcının hafızasından (localStorage) okumaya çalışır.
// Bu sayede kullanıcı sayfayı yenilediğinde çıkış yapmaz.
const initialState = {
  user: null,
  token: localStorage.getItem("token") || null,
  isAuthenticated: false,
  loading: false,
  error: null,
};

// --- ASENKRON İŞLEMLER (THUNKS) ---

// 1. Kullanıcı Kayıt Thunk'ı
export const registerUser = createAsyncThunk(
  "auth/registerUser",
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      if (!response.ok) {
        return rejectWithValue(data.error || "Registration failed");
      }
      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// 2. Kullanıcı Giriş Thunk'ı
export const loginUser = createAsyncThunk(
  "auth/loginUser",
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      if (!response.ok) {
        return rejectWithValue(data.error || "Login failed");
      }
      // Başarılı girişte, backend'den gelen token'ı tarayıcının hafızasına kaydediyoruz.
      localStorage.setItem("token", data.token);
      return data; // { message, token, user }
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    // Çıkış yapma reducer'ı
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.error = null;
      localStorage.removeItem("token");
    },
  },

  extraReducers: (builder) => {
    // Register işleminin durumlarını yönetir
    builder
      .addCase(registerUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Login işleminin durumlarını yönetir
    builder
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { logout } = authSlice.actions;
export default authSlice.reducer;

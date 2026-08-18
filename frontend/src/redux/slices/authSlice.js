import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

axios.defaults.withCredentials = true;
const backendUrl = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_BECKEND_URL;

// Async Thunks
export const checkAuthState = createAsyncThunk(
  'auth/checkAuthState',
  async (_, { rejectWithValue, dispatch }) => {
    try {
      const { data } = await axios.get(`${backendUrl}/api/auth/is-Auth`);
      if (data.success) {
        dispatch(getUserData());
        return true;
      }
      return false;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Authentication check failed');
    }
  }
);

export const getUserData = createAsyncThunk(
  'auth/getUserData',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await axios.get(`${backendUrl}/api/user/data`);
      if (data.success) {
        return {
          userData: data.userData,
          isAccountVerify: data.isAccountVerify,
        };
      }
      return rejectWithValue(data.message);
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch user data');
    }
  }
);

export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async ({ email, password }, { rejectWithValue, dispatch }) => {
    try {
      const { data } = await axios.post(`${backendUrl}/api/auth/login`, { email, password });
      if (data.success) {
        dispatch(getUserData());
        return true;
      }
      return rejectWithValue(data.message);
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Login failed');
    }
  }
);

export const registerUser = createAsyncThunk(
  'auth/registerUser',
  async ({ name, email, password }, { rejectWithValue, dispatch }) => {
    try {
      const { data } = await axios.post(`${backendUrl}/api/auth/register`, { name, email, password });
      if (data.success) {
        dispatch(getUserData());
        return true;
      }
      return rejectWithValue(data.message);
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Registration failed');
    }
  }
);

export const logoutUser = createAsyncThunk(
  'auth/logoutUser',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await axios.post(`${backendUrl}/api/auth/logout`);
      if (data.success) {
        return true;
      }
      return rejectWithValue(data.message);
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Logout failed');
    }
  }
);

const initialState = {
  isLoggedIn: false,
  userData: null,
  isAccountVerify: false,
  authChecked: false,
  loading: false,
  error: null,
  backendUrl,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setIsAccountVerify: (state, action) => {
      state.isAccountVerify = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // checkAuthState
      .addCase(checkAuthState.pending, (state) => {
        state.loading = true;
      })
      .addCase(checkAuthState.fulfilled, (state, action) => {
        state.loading = false;
        state.isLoggedIn = action.payload;
        state.authChecked = true;
      })
      .addCase(checkAuthState.rejected, (state) => {
        state.loading = false;
        state.isLoggedIn = false;
        state.authChecked = true;
      })
      // getUserData
      .addCase(getUserData.fulfilled, (state, action) => {
        state.userData = action.payload.userData;
        state.isAccountVerify = action.payload.isAccountVerify;
      })
      // loginUser
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state) => {
        state.loading = false;
        state.isLoggedIn = true;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // registerUser
      .addCase(registerUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state) => {
        state.loading = false;
        state.isLoggedIn = true;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // logoutUser
      .addCase(logoutUser.fulfilled, (state) => {
        state.isLoggedIn = false;
        state.userData = null;
        state.isAccountVerify = false;
      });
  },
});

export const { setIsAccountVerify } = authSlice.actions;
export default authSlice.reducer;

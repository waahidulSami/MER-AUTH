import axios from "axios";
import { createContext, useEffect, useState } from "react";

export const AppContext = createContext();

export const AppContextProvider = (props) => {
  axios.defaults.withCredentials = true;
  const backendUrl = import.meta.env.VITE_BECKEND_URL;
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userData, setUserData] = useState(null);
  const [isAccountVerify, setIsAccountVerify] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  const getUserData = async () => {
    try {
      const { data } = await axios.get(`${backendUrl}/api/user/data`, {
        withCredentials: true,
      });
      if (data.success) {
        setUserData(data.userData);
        setIsAccountVerify(data.isAccountVerify);
      }
    } catch {
      // Silently fail - auth state check will handle this
    }
  };

  useEffect(() => {
    const getAuthState = async () => {
      try {
        const { data } = await axios.get(backendUrl + "/api/auth/is-Auth", {
          withCredentials: true,
        });
        if (data.success) {
          setIsLoggedIn(true);
          await getUserData();
        }
      } catch {
        // Not logged in - no toast needed
      } finally {
        setAuthChecked(true);
      }
    };
    getAuthState();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = {
    backendUrl,
    isLoggedIn,
    setIsLoggedIn,
    userData,
    setUserData,
    getUserData,
    isAccountVerify,
    setIsAccountVerify,
    authChecked,
  };

  return (
    <AppContext.Provider value={value}>{props.children}</AppContext.Provider>
  );
};

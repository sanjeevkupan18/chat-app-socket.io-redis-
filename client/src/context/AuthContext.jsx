// import { createContext, useContext, useEffect, useState } from "react";

// import api from "../services/api";

// const AuthContext = createContext(null);

// export const AuthProvider = ({ children }) => {
//   const [user, setUser] = useState(null);

//   const [loading, setLoading] = useState(true);

//   /*
//    * INITIAL AUTH CHECK
//    */

//   useEffect(() => {
//     const initializeAuth = async () => {
//       const token = localStorage.getItem("token");

//       const storedUser = localStorage.getItem("user");

//       if (token && storedUser) {
//         try {
//           setUser(JSON.parse(storedUser));

//           /*
//            * Verify token with backend
//            */

//           const response = await api.get("/users/me");

//           setUser(response.data.user);

//           localStorage.setItem("user", JSON.stringify(response.data.user));
//         } catch (error) {
//           localStorage.removeItem("token");

//           localStorage.removeItem("user");

//           setUser(null);
//         }
//       }

//       setLoading(false);
//     };

//     initializeAuth();
//   }, []);

//   /*
//    * LOGIN
//    */

//   const login = async (email, password) => {
//     const response = await api.post("/auth/login", {
//       email,
//       password,
//     });

//     const { token, user } = response.data;

//     localStorage.setItem("token", token);

//     localStorage.setItem("user", JSON.stringify(user));

//     setUser(user);

//     return user;
//   };

//   /*
//    * REGISTER
//    */

//   const register = async (name, email, password) => {
//     const response = await api.post("/auth/register", {
//       name,
//       email,
//       password,
//     });

//     const { token, user } = response.data;

//     localStorage.setItem("token", token);

//     localStorage.setItem("user", JSON.stringify(user));

//     setUser(user);

//     return user;
//   };

//   /*
//    * LOGOUT
//    */

//   const logout = async () => {
//     try {
//       await api.post("/auth/logout");
//     } catch (error) {
//       console.error("Logout API error:", error);
//     } finally {
//       localStorage.removeItem("token");

//       localStorage.removeItem("user");

//       setUser(null);
//     }
//   };

//   return (
//     <AuthContext.Provider
//       value={{
//         user,
//         loading,
//         login,
//         register,
//         logout,
//       }}
//     >
//       {children}
//     </AuthContext.Provider>
//   );
// };

// export const useAuth = () => {
//   const context = useContext(AuthContext);

//   if (!context) {
//     throw new Error("useAuth must be used inside AuthProvider");
//   }

//   return context;
// };

import { createContext, useContext, useEffect, useState } from "react";

import api from "../services/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  const [loading, setLoading] = useState(true);

  /*
   * INITIAL AUTH CHECK
   */

  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem("token");

      const storedUser = localStorage.getItem("user");

      /*
       * No token/user stored
       */

      if (!token || !storedUser) {
        setUser(null);
        setLoading(false);

        return;
      }

      try {
        /*
         * Verify token with backend
         */

        const response = await api.get("/users/me");

        const authenticatedUser = response.data.user;

        /*
         * Set authenticated user
         */

        setUser(authenticatedUser);

        /*
         * Keep localStorage updated
         */

        localStorage.setItem("user", JSON.stringify(authenticatedUser));
      } catch (error) {
        console.error("Authentication initialization error:", error);

        /*
         * Invalid/expired token
         */

        localStorage.removeItem("token");

        localStorage.removeItem("user");

        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  /*
   * LOGIN
   */

  const login = async (email, password) => {
    const response = await api.post("/auth/login", {
      email,
      password,
    });

    const { token, user } = response.data;

    /*
     * Save authentication data
     */

    localStorage.setItem("token", token);

    localStorage.setItem("user", JSON.stringify(user));

    /*
     * Update React state
     */

    setUser(user);

    return user;
  };

  /*
   * REGISTER
   */

  const register = async (name, email, password) => {
    const response = await api.post("/auth/register", {
      name,
      email,
      password,
    });

    const { token, user } = response.data;

    /*
     * Save authentication data
     */

    localStorage.setItem("token", token);

    localStorage.setItem("user", JSON.stringify(user));

    /*
     * Update React state
     */

    setUser(user);

    return user;
  };

  /*
   * UPDATE PROFILE
   */

  const updateProfile = async (updates) => {
    const response = await api.put("/users/me", updates);

    const updatedUser = response.data.user;

    localStorage.setItem("user", JSON.stringify(updatedUser));

    setUser(updatedUser);

    return updatedUser;
  };

  /*
   * LOGOUT
   */

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (error) {
      console.error("Logout API error:", error);
    } finally {
      /*
       * Remove authentication data
       */

      localStorage.removeItem("token");

      localStorage.removeItem("user");

      /*
       * Remove authenticated user
       */

      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
};

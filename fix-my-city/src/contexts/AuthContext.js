// src/contexts/AuthContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth, db } from '../firebase/config';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import axios from 'axios';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState('user');
  const [loading, setLoading] = useState(true);
  const [serverUser, setServerUser] = useState(null);

  // Create axios instance with auth header
  const api = axios.create({
    baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
    headers: {
      'Content-Type': 'application/json',
    }
  });
  
  // Add token to axios requests
  api.interceptors.request.use(
    async (config) => {
      if (auth.currentUser) {
        const token = await auth.currentUser.getIdToken();
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  async function signUp(email, password, displayName) {
    try {
      // Create Firebase user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update profile with display name
      await updateProfile(userCredential.user, { displayName });
      
      // Create user document in Firestore
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        email,
        displayName,
        role: 'user',
        createdAt: new Date().toISOString()
      });

      // Sync with backend
      try {
        const idToken = await userCredential.user.getIdToken();
        const response = await api.post('/auth/login', { 
          idToken,
          name: displayName
        });
        setServerUser(response.data.user);
      } catch (serverError) {
        console.error("Error syncing with server:", serverError);
        // Continue anyway as Firebase auth was successful
      }
      
      return userCredential.user;
    } catch (error) {
      throw error;
    }
  }

  async function loginWithEmail(email, password) {
    try {
      // Firebase authentication
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Sync with backend
      try {
        const idToken = await userCredential.user.getIdToken();
        const response = await api.post('/auth/login', { idToken });
        setServerUser(response.data.user);
      } catch (serverError) {
        console.error("Error syncing with server:", serverError);
        // Continue anyway as Firebase auth was successful
      }
      
      return userCredential;
    } catch (error) {
      throw error;
    }
  }

  async function logout() {
    try {
      // Notify backend of logout
      try {
        await api.post('/auth/logout');
      } catch (serverError) {
        console.error("Error logging out from server:", serverError);
      }
      
      // Firebase logout
      await signOut(auth);
      setServerUser(null);
    } catch (error) {
      throw error;
    }
  }

  function resetPassword(email) {
    return sendPasswordResetEmail(auth, email);
  }

  async function fetchUserRole(user) {
    if (!user) return 'user';
    
    try {
      // First try to get role from server
      try {
        const response = await api.get('/auth/me');
        if (response.data && response.data.success) {
          setServerUser(response.data.user);
          return response.data.user.role || 'user';
        }
      } catch (serverError) {
        console.error("Error fetching user from server:", serverError);
        // Fall back to Firestore if server fails
      }
      
      // Fallback to Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        return userDoc.data().role || 'user';
      }
      return 'user';
    } catch (error) {
      console.error("Error fetching user role:", error);
      return 'user';
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const role = await fetchUserRole(user);
        setUserRole(role);
      } else {
        setUserRole('user');
        setServerUser(null);
      }
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Sync user data with server periodically when logged in
  useEffect(() => {
    let intervalId;
    
    if (currentUser) {
      // Initial fetch
      fetchUserRole(currentUser);
      
      // Set up periodic refresh (e.g., every 15 minutes)
      intervalId = setInterval(async () => {
        try {
          const response = await api.get('/auth/me');
          if (response.data && response.data.success) {
            setServerUser(response.data.user);
            setUserRole(response.data.user.role || 'user');
          }
        } catch (error) {
          console.error("Error refreshing user data:", error);
        }
      }, 15 * 60 * 1000); // 15 minutes
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [currentUser]);

  const value = {
    currentUser,
    serverUser, // Add server user data
    userRole,
    isAdmin: userRole === 'admin',
    signUp,
    loginWithEmail,
    logout,
    resetPassword,
    api, // Expose authenticated API instance
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
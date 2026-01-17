// src/context/AuthContext.js
import { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup,
  signOut
} from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, googleProvider, db } from '@/lib/firebase/config';
import { useRouter } from 'next/router';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setUserProfile(userDoc.data());
        } else {
          const defaultProfile = {
            uid: user.uid,
            email: user.email,
            role: '',
            profile: {
              name: user.displayName || '',
              phone: '',
              photoURL: user.photoURL || '',
              createdAt: new Date().toISOString()
            }
          };
          await setDoc(doc(db, 'users', user.uid), defaultProfile);
          setUserProfile(defaultProfile);
        }
      } else {
        setUser(null);
        setUserProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const checkRegistrationStatus = async (userId, role) => {
    if (role === 'caretaker') {
      const q = query(collection(db, 'caretakers'), where('userId', '==', userId));
      const snapshot = await getDocs(q);
      return !snapshot.empty;
    } else if (role === 'user') {
      const q = query(collection(db, 'nriUsers'), where('userId', '==', userId));
      const snapshot = await getDocs(q);
      return !snapshot.empty;
    }
    return false;
  };

  const loginWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const userDoc = await getDoc(doc(db, 'users', result.user.uid));
      
      if (userDoc.exists()) {
        const profile = userDoc.data();
        setUserProfile(profile);
        
        // Check if user has selected a role
        if (!profile.role) {
          router.push('/auth/register');
          return result;
        }
        
        // Check if registration is complete
        const isRegistered = await checkRegistrationStatus(result.user.uid, profile.role);
        
        if (!isRegistered) {
          router.push('/auth/register');
        } else {
          // Redirect to appropriate dashboard
          if (profile.role === 'caretaker') {
            router.push('/caretaker');
          } else {
            router.push('/user');
          }
        }
      } else {
        // New user - redirect to registration
        router.push('/auth/register');
      }
      
      return result;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setUserProfile(null);
      router.push('/');
    } catch (error) {
      throw error;
    }
  };

  const updateUserProfile = async (updates) => {
    try {
      if (!user) return;
      
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, updates, { merge: true });
      
      setUserProfile(prev => ({
        ...prev,
        ...updates
      }));
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  };

  const value = {
    user,
    userProfile,
    loading,
    loginWithGoogle,
    logout,
    updateUserProfile,
    checkRegistrationStatus
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
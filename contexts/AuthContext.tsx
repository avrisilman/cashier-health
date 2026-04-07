import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Store } from '@/types/database';

interface User {
  id: string;
  email: string;
}

interface Session {
  user: User;
  token: string;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  store: Store | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (
    email: string,
    password: string,
    storeName: string,
    ownerName: string,
    phoneNumber: string
  ) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshStore: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSession();
  }, []);

  const loadSession = async () => {
    try {
      const sessionData = await AsyncStorage.getItem('session');
      const storeData = await AsyncStorage.getItem('store');

      if (sessionData) {
        const parsedSession = JSON.parse(sessionData);
        setSession(parsedSession);
        setUser(parsedSession.user);
      }

      if (storeData) {
        setStore(JSON.parse(storeData));
      }
    } catch (error) {
      console.error('Error loading session:', error);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const usersData = await AsyncStorage.getItem('users');
      const users = usersData ? JSON.parse(usersData) : [];

      const foundUser = users.find(
        (u: any) => u.email === email && u.password === password
      );

      if (!foundUser) {
        return { error: { message: 'Invalid email or password' } };
      }

      const newSession: Session = {
        user: {
          id: foundUser.id,
          email: foundUser.email,
        },
        token: `mock_token_${Date.now()}`,
      };

      await AsyncStorage.setItem('session', JSON.stringify(newSession));
      await AsyncStorage.setItem('store', JSON.stringify(foundUser.store));

      setSession(newSession);
      setUser(newSession.user);
      setStore(foundUser.store);

      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const signUp = async (
    email: string,
    password: string,
    storeName: string,
    ownerName: string,
    phoneNumber: string
  ) => {
    try {
      const usersData = await AsyncStorage.getItem('users');
      const users = usersData ? JSON.parse(usersData) : [];

      const existingUser = users.find((u: any) => u.email === email);
      if (existingUser) {
        return { error: { message: 'User already exists' } };
      }

      const userId = `user_${Date.now()}`;
      const storeId = `store_${Date.now()}`;

      const newStore: Store = {
        id: storeId,
        name: storeName,
        owner_name: ownerName,
        phone_number: phoneNumber,
        user_id: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const newUser = {
        id: userId,
        email,
        password,
        store: newStore,
      };

      users.push(newUser);
      await AsyncStorage.setItem('users', JSON.stringify(users));

      const categories = [
        { id: `cat_${Date.now()}_1`, name: 'All', icon: 'package', store_id: storeId, created_at: new Date().toISOString() },
        { id: `cat_${Date.now()}_2`, name: 'Food', icon: 'utensils', store_id: storeId, created_at: new Date().toISOString() },
        { id: `cat_${Date.now()}_3`, name: 'Drinks', icon: 'coffee', store_id: storeId, created_at: new Date().toISOString() },
        { id: `cat_${Date.now()}_4`, name: 'Snacks', icon: 'cookie', store_id: storeId, created_at: new Date().toISOString() },
      ];

      await AsyncStorage.setItem(`categories_${storeId}`, JSON.stringify(categories));
      await AsyncStorage.setItem(`products_${storeId}`, JSON.stringify([]));
      await AsyncStorage.setItem(`transactions_${storeId}`, JSON.stringify([]));

      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const signOut = async () => {
    await AsyncStorage.removeItem('session');
    await AsyncStorage.removeItem('store');
    setSession(null);
    setUser(null);
    setStore(null);
  };

  const refreshStore = async () => {
    if (user) {
      const storeData = await AsyncStorage.getItem('store');
      if (storeData) {
        setStore(JSON.parse(storeData));
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        store,
        loading,
        signIn,
        signUp,
        signOut,
        refreshStore,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

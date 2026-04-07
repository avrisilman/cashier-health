import React, { createContext, useState, useEffect, useContext } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { Store } from '@/types/database';

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
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadStore(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadStore(session.user.id);
      } else {
        setStore(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadStore = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      setStore(data);
    } catch (error) {
      console.error('Error loading store:', error);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error };
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
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) return { error: authError };

      if (authData.user) {
        const { data: storeData, error: storeError } = await supabase
          .from('stores')
          .insert({
            name: storeName,
            owner_name: ownerName,
            phone_number: phoneNumber,
            user_id: authData.user.id,
          })
          .select()
          .single();

        if (storeError) return { error: storeError };

        if (storeData) {
          const { error: categoryError } = await supabase
            .from('categories')
            .insert([
              { name: 'All', icon: 'package', store_id: storeData.id },
              { name: 'Food', icon: 'utensils', store_id: storeData.id },
              { name: 'Drinks', icon: 'coffee', store_id: storeData.id },
              { name: 'Snacks', icon: 'cookie', store_id: storeData.id },
            ]);

          if (categoryError) {
            console.error('Error creating categories:', categoryError);
          }
        }
      }

      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setStore(null);
  };

  const refreshStore = async () => {
    if (user) {
      await loadStore(user.id);
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

import { createContext, useContext, useState, useEffect } from 'react';
import { AuthContext } from './AuthContext';
import { API_URL } from '../config';

const InboxContext = createContext();

export const useInbox = () => {
  const context = useContext(InboxContext);
  if (!context) {
    throw new Error('useInbox must be used within an InboxProvider');
  }
  return context;
};

export const InboxProvider = ({ children }) => {
  const { user } = useContext(AuthContext);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = async () => {
    if (!user) {
      setUnreadCount(0);
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/inbox/unread-count`, {
        credentials: 'include'
      });
      const data = await response.json();
      setUnreadCount(data.unreadCount);
    } catch (error) {
      console.error('Error fetching unread count:', error);
      setUnreadCount(0);
    }
  };

  const refreshUnreadCount = () => {
    fetchUnreadCount();
  };

  useEffect(() => {
    fetchUnreadCount();

  }, [user]);

  return (
    <InboxContext.Provider value={{ unreadCount, refreshUnreadCount }}>
      {children}
    </InboxContext.Provider>
  );
};
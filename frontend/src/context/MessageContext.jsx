import { createContext, useContext, useState } from 'react';
import MessageModal from '../components/MessageModal';

const MessageContext = createContext();

export const useMessage = () => {
  const context = useContext(MessageContext);
  if (!context) {
    throw new Error('useMessage must be used within a MessageProvider');
  }
  return context;
};

export const MessageProvider = ({ children }) => {
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [messageModalOpen, setMessageModalOpen] = useState(false);

  const showMessage = (message) => {
    setSelectedMessage(message);
    setMessageModalOpen(true);
  };

  const hideMessage = () => {
    setMessageModalOpen(false);
    setSelectedMessage(null);
  };

  return (
    <MessageContext.Provider value={{ showMessage, hideMessage }}>
      {children}
      <MessageModal 
        message={selectedMessage}
        isOpen={messageModalOpen}
        onClose={hideMessage}
      />
    </MessageContext.Provider>
  );
};
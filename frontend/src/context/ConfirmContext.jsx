import { createContext, useContext, useState } from 'react';
import ConfirmDialog from '../components/ConfirmDialog';

const ConfirmContext = createContext();

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context;
};

export const ConfirmProvider = ({ children }) => {
  const [confirmState, setConfirmState] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    type: 'danger',
    onConfirm: () => {},
    resolve: null
  });

  const showConfirm = ({
    title = "Confirm Action",
    message = "Are you sure you want to proceed?",
    confirmText = "Confirm",
    cancelText = "Cancel",
    type = "danger"
  }) => {
    return new Promise((resolve) => {
      setConfirmState({
        isOpen: true,
        title,
        message,
        confirmText,
        cancelText,
        type,
        resolve, // Store resolve function
        onConfirm: () => {
          resolve(true);
          hideConfirm();
        }
      });
    });
  };

  const hideConfirm = () => {
    setConfirmState(prev => ({
      ...prev,
      isOpen: false
    }));
  };

  const handleClose = () => {
    // Resolve with false when dialog is closed without confirming
    if (confirmState.onConfirm) {
      // We need to track the resolve function separately
      const currentResolve = confirmState.resolve;
      if (currentResolve) {
        currentResolve(false);
      }
    }
    hideConfirm();
  };

  return (
    <ConfirmContext.Provider value={{ showConfirm }}>
      {children}
      <ConfirmDialog 
        isOpen={confirmState.isOpen}
        onClose={handleClose}
        onConfirm={confirmState.onConfirm}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        cancelText={confirmState.cancelText}
        type={confirmState.type}
      />
    </ConfirmContext.Provider>
  );
};
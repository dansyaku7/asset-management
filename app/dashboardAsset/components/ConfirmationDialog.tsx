"use client";
import React from 'react';

// Ikon untuk memberi visual warning
const WarningIcon = () => (
    <svg className="h-12 w-12 text-red-500" stroke="currentColor" fill="none" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
);

type ConfirmationDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
};

export default function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Ya, Lanjutkan",
}: ConfirmationDialogProps) {
  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-sm text-center">
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
            <WarningIcon />
        </div>
        <h3 className="text-xl font-bold text-gray-900">{title}</h3>
        <p className="text-gray-600 mt-2 mb-6">{message}</p>
        
        <div className="flex justify-center gap-4">
          <button 
            type="button" 
            onClick={onClose} 
            className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-semibold"
          >
            Batal
          </button>
          <button 
            type="button" 
            onClick={handleConfirm} 
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

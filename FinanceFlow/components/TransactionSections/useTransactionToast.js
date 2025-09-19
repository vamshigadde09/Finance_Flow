import { useState, useCallback } from 'react';

const useTransactionToast = () => {
    const [toastState, setToastState] = useState({
        visible: false,
        type: 'processing',
        title: '',
        subtitle: '',
        footer: '',
        transactionType: 'transaction',
        amount: null,
    });

    const showProcessing = useCallback((transactionType = 'transaction', amount = null) => {
        setToastState({
            visible: true,
            type: 'processing',
            title: 'Processing Transaction...',
            subtitle: 'Please wait while we process your request',
            footer: '',
            transactionType,
            amount,
        });
    }, []);

    const showSuccess = useCallback((transactionType = 'transaction', amount = null, customMessage = null) => {
        const getSuccessMessage = () => {
            if (customMessage) return customMessage;

            switch (transactionType) {
                case 'personal':
                    return amount ? `₹${amount} ${amount > 0 ? 'added to' : 'deducted from'} your account` : 'Transaction completed successfully';
                case 'contact':
                    return amount ? `₹${amount} sent to contact` : 'Payment sent successfully';
                case 'split':
                    return amount ? `₹${amount} split with group members` : 'Split transaction created';
                default:
                    return amount ? `₹${amount} transaction completed` : 'Transaction completed successfully';
            }
        };

        setToastState({
            visible: true,
            type: 'success',
            title: '🎉 Transaction Successful!',
            subtitle: getSuccessMessage(),
            footer: 'Processing completed ✓',
            transactionType,
            amount,
        });
    }, []);

    const showError = useCallback((errorMessage = 'Transaction failed', transactionType = 'transaction') => {
        setToastState({
            visible: true,
            type: 'error',
            title: '❌ Transaction Failed',
            subtitle: errorMessage,
            footer: 'Please try again',
            transactionType,
            amount: null,
        });
    }, []);

    const hideToast = useCallback(() => {
        setToastState(prev => ({
            ...prev,
            visible: false,
        }));
    }, []);

    return {
        toastState,
        showProcessing,
        showSuccess,
        showError,
        hideToast,
    };
};

export default useTransactionToast; 
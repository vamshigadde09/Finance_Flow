import axiosInstance from '../utils/axiosConfig';

// User Authentication APIs
export const authAPI = {
    // Register user
    register: async (userData) => {
        try {
            const response = await axiosInstance.post('/api/v1/user/register', userData);
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    // Login user
    login: async (credentials) => {
        try {
            const response = await axiosInstance.post('/api/v1/user/login', credentials);
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    // Get user profile
    getProfile: async () => {
        try {
            const response = await axiosInstance.get('/api/v1/user/profile');
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    // Update user profile
    updateProfile: async (userData) => {
        try {
            const response = await axiosInstance.put('/api/v1/user/profile', userData);
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    }
};

// Split Groups APIs
export const splitGroupAPI = {
    // Get all split groups
    getGroups: async () => {
        try {
            const response = await axiosInstance.get('/api/v1/splitgroups');
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    // Create split group
    createGroup: async (groupData) => {
        try {
            const response = await axiosInstance.post('/api/v1/splitgroups', groupData);
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    // Get group by ID
    getGroupById: async (groupId) => {
        try {
            const response = await axiosInstance.get(`/api/v1/splitgroups/${groupId}`);
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    // Update group
    updateGroup: async (groupId, groupData) => {
        try {
            const response = await axiosInstance.put(`/api/v1/splitgroups/${groupId}`, groupData);
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    // Delete group
    deleteGroup: async (groupId) => {
        try {
            const response = await axiosInstance.delete(`/api/v1/splitgroups/${groupId}`);
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    }
};

// Split Transactions APIs
export const splitAPI = {
    // Get splits for a group
    getSplits: async (groupId) => {
        try {
            const response = await axiosInstance.get(`/api/v1/splits/group/${groupId}`);
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    // Create split transaction
    createSplit: async (splitData) => {
        try {
            const response = await axiosInstance.post('/api/v1/splits', splitData);
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    // Update split transaction
    updateSplit: async (splitId, splitData) => {
        try {
            const response = await axiosInstance.put(`/api/v1/splits/${splitId}`, splitData);
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    // Delete split transaction
    deleteSplit: async (splitId) => {
        try {
            const response = await axiosInstance.delete(`/api/v1/splits/${splitId}`);
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    }
};

// Personal Transactions APIs
export const personalAPI = {
    // Get personal transactions
    getTransactions: async () => {
        try {
            const response = await axiosInstance.get('/api/v1/personal');
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    // Create personal transaction
    createTransaction: async (transactionData) => {
        try {
            const response = await axiosInstance.post('/api/v1/personal', transactionData);
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    // Update personal transaction
    updateTransaction: async (transactionId, transactionData) => {
        try {
            const response = await axiosInstance.put(`/api/v1/personal/${transactionId}`, transactionData);
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    // Delete personal transaction
    deleteTransaction: async (transactionId) => {
        try {
            const response = await axiosInstance.delete(`/api/v1/personal/${transactionId}`);
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    }
};

// Bank Account APIs
export const bankAccountAPI = {
    // Get bank accounts
    getAccounts: async () => {
        try {
            const response = await axiosInstance.get('/api/v1/bankaccounts');
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    // Create bank account
    createAccount: async (accountData) => {
        try {
            const response = await axiosInstance.post('/api/v1/bankaccounts', accountData);
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    // Update bank account
    updateAccount: async (accountId, accountData) => {
        try {
            const response = await axiosInstance.put(`/api/v1/bankaccounts/${accountId}`, accountData);
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    // Delete bank account
    deleteAccount: async (accountId) => {
        try {
            const response = await axiosInstance.delete(`/api/v1/bankaccounts/${accountId}`);
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    }
};

// Contact APIs
export const contactAPI = {
    // Get contacts
    getContacts: async () => {
        try {
            const response = await axiosInstance.get('/api/v1/contact');
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    // Create contact
    createContact: async (contactData) => {
        try {
            const response = await axiosInstance.post('/api/v1/contact', contactData);
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    // Update contact
    updateContact: async (contactId, contactData) => {
        try {
            const response = await axiosInstance.put(`/api/v1/contact/${contactId}`, contactData);
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    // Delete contact
    deleteContact: async (contactId) => {
        try {
            const response = await axiosInstance.delete(`/api/v1/contact/${contactId}`);
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    }
};

// Template APIs
export const templateAPI = {
    // Get templates
    getTemplates: async () => {
        try {
            const response = await axiosInstance.get('/api/v1/templates');
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    // Create template
    createTemplate: async (templateData) => {
        try {
            const response = await axiosInstance.post('/api/v1/templates', templateData);
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    // Update template
    updateTemplate: async (templateId, templateData) => {
        try {
            const response = await axiosInstance.put(`/api/v1/templates/${templateId}`, templateData);
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    // Delete template
    deleteTemplate: async (templateId) => {
        try {
            const response = await axiosInstance.delete(`/api/v1/templates/${templateId}`);
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    }
};

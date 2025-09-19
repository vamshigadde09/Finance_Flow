import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    TextInput,
    Modal,
    Alert,
    Dimensions,
    Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { CalendarList } from 'react-native-calendars';
import { BarChart, LineChart, PieChart } from 'react-native-chart-kit';
import { PanGestureHandler, State, GestureHandlerRootView } from 'react-native-gesture-handler';
import Svg, { Path } from 'react-native-svg';
import TransactionDetailsScreen from '../../TransactionSections/TransactionDetailsScreen';

import { API_BASE_URL } from '../../../api';

const FiltersView = () => {
    const navigation = useNavigation();
    const [loading, setLoading] = useState(false);
    const [transactions, setTransactions] = useState([]);
    const [filteredTransactions, setFilteredTransactions] = useState([]);

    // Filter states
    const [dateRange, setDateRange] = useState(() => {
        const today = new Date();
        const start = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
        const end = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
        return { startDate: start, endDate: end };
    });
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [selectedCategories, setSelectedCategories] = useState([]);
    const [selectedTransactionTypes, setSelectedTransactionTypes] = useState(['expense']);
    const [amountRange, setAmountRange] = useState({
        min: '',
        max: ''
    });

    // Available options
    const [availableCategories, setAvailableCategories] = useState([]);
    const [bankAccounts, setBankAccounts] = useState([]);
    const [selectedBankAccounts, setSelectedBankAccounts] = useState([]);

    // Track if filters have been applied
    const [filtersApplied, setFiltersApplied] = useState(false);

    // Track if stats are expanded
    const [statsExpanded, setStatsExpanded] = useState(false);

    // Chart configuration states
    const [chartMetric, setChartMetric] = useState('expense'); // 'expense', 'income', 'net'



    // Animation
    const slideAnim = useState(new Animated.Value(0))[0];

    const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    const MONTHS = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const [calendarMonth, setCalendarMonth] = useState(() => {
        const now = new Date();
        return { month: now.getMonth(), year: now.getFullYear() };
    });

    const [selectedBarIndex, setSelectedBarIndex] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [showTransactionsModal, setShowTransactionsModal] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState(null);
    const [showFullDetails, setShowFullDetails] = useState(false);
    const [userId, setUserId] = useState(null);
    const [showDailyTransactionsModal, setShowDailyTransactionsModal] = useState(false);
    const [selectedDailyTransactions, setSelectedDailyTransactions] = useState([]);
    const [selectedDailyDate, setSelectedDailyDate] = useState(null);

    // Calculator states
    const [showCalculator, setShowCalculator] = useState(false);
    const [calculatorDisplay, setCalculatorDisplay] = useState('0');
    const [calculatorHistory, setCalculatorHistory] = useState([]);
    const [calculatorMemory, setCalculatorMemory] = useState(0);
    const [calculatorOperation, setCalculatorOperation] = useState(null);
    const [calculatorPreviousValue, setCalculatorPreviousValue] = useState(null);
    const [calculatorWaitingForOperand, setCalculatorWaitingForOperand] = useState(false);
    const [calculatorHistoryExpanded, setCalculatorHistoryExpanded] = useState(false);
    const [showDeleteHistoryAlert, setShowDeleteHistoryAlert] = useState(false);

    function getDaysInMonth(month, year) {
        const numDays = new Date(year, month + 1, 0).getDate();
        const days = [];
        for (let i = 1; i <= numDays; i++) {
            days.push(new Date(year, month, i));
        }
        return days;
    }

    function getCalendarGrid(month, year) {
        const days = getDaysInMonth(month, year);
        const firstDay = days[0].getDay(); // 0=Sun, 1=Mon...
        const grid = [];
        let week = [];

        // Add previous month's days
        const prevMonth = month === 0 ? 11 : month - 1;
        const prevYear = month === 0 ? year - 1 : year;
        const daysInPrevMonth = new Date(year, month, 0).getDate();

        // Calculate how many days from previous month to show
        const daysFromPrevMonth = firstDay === 0 ? 6 : firstDay - 1; // Monday = 1, so we need 0 days from prev month

        for (let i = daysFromPrevMonth - 1; i >= 0; i--) {
            const prevDay = new Date(prevYear, prevMonth, daysInPrevMonth - i);
            week.push(prevDay);
        }

        // Add current month's days
        days.forEach((d) => {
            if (week.length === 7) {
                grid.push(week);
                week = [];
            }
            week.push(d);
        });

        // Add next month's days to complete the last week
        const nextMonth = month === 11 ? 0 : month + 1;
        const nextYear = month === 11 ? year + 1 : year;
        let nextDay = 1;

        while (week.length < 7) {
            const nextDate = new Date(nextYear, nextMonth, nextDay);
            week.push(nextDate);
            nextDay++;
        }

        if (week.length > 0) {
            grid.push(week);
        }

        return grid;
    }

    function isSameDay(a, b) {
        return a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
    }
    function isInRange(day, start, end) {
        if (!start || !end) return false;
        const t = day.setHours(0, 0, 0, 0);
        return t >= start.setHours(0, 0, 0, 0) && t <= end.setHours(0, 0, 0, 0);
    }

    useEffect(() => {
        fetchTransactions();
        loadCalculatorHistory();
        Animated.timing(slideAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
        }).start();

        // Get userId from AsyncStorage
        const getUserData = async () => {
            try {
                const userData = await AsyncStorage.getItem('userData');
                if (userData) {
                    const user = JSON.parse(userData);
                    setUserId(user._id || user.id);
                }
            } catch (error) {
                // Error getting user data
            }
        };
        getUserData();
    }, []);





    const fetchTransactions = async () => {
        setLoading(true);
        try {
            const token = await AsyncStorage.getItem('token');
            const userData = await AsyncStorage.getItem('userData');

            // Fetch transactions
            const response = await axios.get(
                `${API_BASE_URL}/api/v1/personal/get-all-transactions`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            const fetchedTransactions = response.data.transactions || [];


            // Apply same filtering as AllViewTans.js - filter out group transactions not paid by user
            let filteredTransactions = fetchedTransactions;
            if (userData) {
                try {
                    const user = JSON.parse(userData);
                    const userId = user._id || user.id;
                    filteredTransactions = fetchedTransactions.filter(t => !t.isGroupTransaction || (t.paidBy && String(t.paidBy) === String(userId)));

                } catch (error) {
                }
            }

            setTransactions(filteredTransactions);
            setFilteredTransactions(filteredTransactions);

            // Extract unique categories from filtered transactions
            const categories = [...new Set(filteredTransactions.map(t => t.category).filter(Boolean))];
            setAvailableCategories(categories);


            // Fetch bank accounts
            if (userData) {
                try {
                    const user = JSON.parse(userData);
                    const bankResponse = await axios.get(
                        `${API_BASE_URL}/api/v1/bankaccounts/get-bank-accounts/${user._id || user.id}`,
                        { headers: { Authorization: `Bearer ${token}` } }
                    );

                    if (bankResponse.data.success && bankResponse.data.data) {
                        setBankAccounts(bankResponse.data.data);
                        // Select all bank accounts by default
                        const bankAccountIds = bankResponse.data.data.map(acc => acc._id);
                        setSelectedBankAccounts(bankAccountIds);
                    }
                } catch (bankError) {
                    // Error fetching bank accounts
                }
            }

        } catch (error) {
            Alert.alert('Error', 'Failed to fetch transactions');
        } finally {
            setLoading(false);
        }
    };

    const applyFilters = () => {
        try {


            let filtered = [...transactions];

            // Date range filter
            filtered = filtered.filter(t => {
                try {
                    const transactionDate = parseTransactionDate(t);
                    if (!transactionDate) {
                        console.warn('Skipping transaction with invalid date:', t._id);
                        return false;
                    }

                    return safeDateRangeCheck(transactionDate, dateRange.startDate, dateRange.endDate);
                } catch (error) {
                    console.error('Error filtering transaction by date:', error, t._id);
                    return false;
                }
            });

            // Category filter
            if (selectedCategories.length > 0) {
                filtered = filtered.filter(t => selectedCategories.includes(t.category));
            }

            // Bank account filter
            if (selectedBankAccounts.length > 0) {
                filtered = filtered.filter(t => {
                    const transactionBankAccount = t.bankAccount ? (t.bankAccount._id || t.bankAccount) : null;
                    const isIncluded = transactionBankAccount && selectedBankAccounts.includes(transactionBankAccount);
                    return isIncluded;
                });
            }

            // Amount range filter
            if (amountRange.min !== '') {
                filtered = filtered.filter(t => t.amount >= parseFloat(amountRange.min));
            }
            if (amountRange.max !== '') {
                filtered = filtered.filter(t => t.amount <= parseFloat(amountRange.max));
            }



            setFilteredTransactions(filtered);
            // // Debug: Active date range after applying filters
            // try {
            //     console.log('[FiltersView] Applied date range:', {
            //         start: dateRange.startDate?.toISOString?.() || String(dateRange.startDate),
            //         end: dateRange.endDate?.toISOString?.() || String(dateRange.endDate),
            //     });
            // } catch (e) { }
            setFiltersApplied(true);
        } catch (error) {
            console.error('Date filtering error:', error);
            Alert.alert('Error', 'Failed to apply date filters');
        }
    };

    const clearFilters = () => {
        const today = new Date();
        setDateRange({
            startDate: today, // Today only
            endDate: today    // Today only
        });
        setSelectedCategories([]);
        setSelectedBankAccounts(bankAccounts.map(acc => acc._id));
        setAmountRange({ min: '', max: '' });
        setFilteredTransactions(transactions); // This will use the already filtered transactions
        setFiltersApplied(false);
    };

    const toggleCategory = (category) => {
        setSelectedCategories(prev =>
            prev.includes(category)
                ? prev.filter(c => c !== category)
                : [...prev, category]
        );
    };

    const toggleBankAccount = (bankAccountId) => {
        setSelectedBankAccounts(prev => {
            const newSelection = prev.includes(bankAccountId)
                ? prev.filter(id => id !== bankAccountId)
                : [...prev, bankAccountId];

            return newSelection;
        });
    };



    const formatDate = (date) => {
        if (!date) return '';
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const getFilteredStats = () => {
        const incomes = filteredTransactions
            .filter(t => t.transactionType === 'income')
            .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

        const expenses = filteredTransactions
            .filter(t => t.transactionType === 'expense')
            .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

        return {
            income: incomes,
            expenses,
            net: incomes - expenses,
            count: filteredTransactions.length
        };
    };

    const stats = getFilteredStats();

    const chartWidth = (() => {
        const screenWidth = Dimensions.get('window').width;

        // Calculate how many data points we'll have
        let dataPoints = 0;
        if (daysDiff <= 7) {
            dataPoints = daysDiff;
        } else if (daysDiff <= 30) {
            dataPoints = Math.ceil(daysDiff / 7);
        } else if (daysDiff <= 60) {
            dataPoints = Math.ceil(daysDiff / 14);
        } else if (daysDiff <= 90) {
            dataPoints = Math.ceil(daysDiff / 7);
        } else {
            dataPoints = Math.ceil(daysDiff / 30);
        }

        // Minimum width per bar/point should be 60px for readability
        const minWidthPerPoint = 60;
        const calculatedWidth = Math.max(dataPoints * minWidthPerPoint, screenWidth * 0.8);

        return calculatedWidth;
    })();

    // Dynamic chart configuration based on data range
    const getChartConfig = (data) => {
        const maxValue = Math.max(...data, 0);
        const minValue = Math.min(...data, 0);
        const range = maxValue - minValue;

        let segments = 4;
        let decimalPlaces = 0;

        if (range > 1000000) {
            segments = 5;
            decimalPlaces = 1;
        } else if (range > 100000) {
            segments = 4;
            decimalPlaces = 0;
        } else if (range > 10000) {
            segments = 4;
            decimalPlaces = 0;
        } else if (range > 1000) {
            segments = 3;
            decimalPlaces = 0;
        } else {
            segments = 2;
            decimalPlaces = 0;
        }

        return {
            backgroundGradientFrom: '#fff',
            backgroundGradientTo: '#fff',
            color: (opacity = 1) => {
                if (chartMetric === 'net') {
                    return `rgba(${opacity > 0.5 ? '46, 125, 50' : '198, 40, 40'}, ${opacity})`;
                }
                return `rgba(108, 99, 255, ${opacity})`;
            },
            labelColor: (opacity = 1) => `rgba(34, 34, 34, ${opacity})`,
            barPercentage: 0.7,
            decimalPlaces: decimalPlaces,
            style: { borderRadius: 16 },
            segments: segments,
        };
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isCurrentMonth = calendarMonth.month === today.getMonth() && calendarMonth.year === today.getFullYear();



    // Add this helper function inside FiltersView:
    function getDetailsCardLabel(selectedBarIndex) {
        if (selectedBarIndex == null) return '';
        if (daysDiff <= 7) {
            // Daily: show full date with day name
            const d = new Date(startDate);
            d.setDate(startDate.getDate() + selectedBarIndex);
            const dayName = d.toLocaleDateString('en-US', { weekday: 'long' });
            const dateString = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            return `${dayName}, ${dateString}`;
        } else if (daysDiff <= 31) {
            // Weekly: show full date range with day names
            const weekStart = new Date(startDate);
            weekStart.setDate(startDate.getDate() + selectedBarIndex * 7);
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);
            // Clamp weekEnd to endDate
            if (weekEnd > dateRange.endDate) weekEnd.setTime(dateRange.endDate.getTime());
            const startDayName = weekStart.toLocaleDateString('en-US', { weekday: 'short' });
            const endDayName = weekEnd.toLocaleDateString('en-US', { weekday: 'short' });
            return `${startDayName} ${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDayName} ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
        } else {
            // Monthly: show month and year
            const monthDate = new Date(startDate);
            monthDate.setMonth(startDate.getMonth() + selectedBarIndex);
            return monthDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        }
    }

    // Function to get daily breakdown for a selected period
    function getDailyBreakdown(selectedBarIndex) {
        if (selectedBarIndex == null) return [];



        // Use the same captured dateRange as the chart calculation to ensure consistency
        const currentDateRange = {
            startDate: new Date(dateRange.startDate),
            endDate: new Date(dateRange.endDate)
        };

        // Calculate daysDiff using the captured dateRange - same logic as chart calculation
        const currentDaysDiff = Math.ceil((currentDateRange.endDate - currentDateRange.startDate) / (1000 * 60 * 60 * 24)) + 1;
        const currentStartDate = new Date(currentDateRange.startDate);

        let periodStart, periodEnd;

        // Use the same logic as chart calculation to ensure consistency
        if (currentDaysDiff <= 7) {
            // Daily view - just one day
            const day = new Date(currentStartDate);
            day.setDate(currentStartDate.getDate() + selectedBarIndex);
            periodStart = new Date(day);
            periodEnd = new Date(day);
        } else if (currentDaysDiff <= 31) {
            // Weekly view - 7 days (same as chart calculation)
            const weekStart = new Date(currentStartDate);
            weekStart.setDate(currentStartDate.getDate() + (selectedBarIndex * 7) + 1); // +1 to match chart logic
            periodStart = new Date(weekStart);
            periodEnd = new Date(weekStart);
            periodEnd.setDate(weekStart.getDate() + 6);
            // Clamp to endDate
            if (periodEnd > currentDateRange.endDate) periodEnd.setTime(currentDateRange.endDate.getTime());
        } else {
            // For periods longer than 31 days, use weekly view as fallback (same as chart)
            const weekStart = new Date(currentStartDate);
            weekStart.setDate(currentStartDate.getDate() + (selectedBarIndex * 7));
            periodStart = new Date(weekStart);
            periodEnd = new Date(weekStart);
            periodEnd.setDate(weekStart.getDate() + 6);
            // Clamp to endDate
            if (periodEnd > currentDateRange.endDate) periodEnd.setTime(currentDateRange.endDate.getTime());
        }



        // Get transactions for this period
        const periodTransactions = filteredTransactions.filter(t => {
            const transactionDate = t.dateDetails ? new Date(t.dateDetails.date + 'T00:00:00') : new Date(t.createdAt);
            const isInPeriod = transactionDate >= periodStart && transactionDate <= periodEnd;
            return isInPeriod;
        });



        // Group by day
        const dailyMap = {};
        const currentDate = new Date(periodStart);

        while (currentDate <= periodEnd) {
            const dateKey = currentDate.toISOString().split('T')[0];
            dailyMap[dateKey] = {
                date: new Date(currentDate),
                income: 0,
                expense: 0,
                transactions: []
            };
            currentDate.setDate(currentDate.getDate() + 1);
        }

        // Populate daily data
        periodTransactions.forEach(t => {
            // Use the EXACT SAME date calculation logic as the filtering section above
            const transactionDate = t.dateDetails ? new Date(t.dateDetails.date + 'T00:00:00') : new Date(t.createdAt);
            const dateKey = transactionDate.toISOString().split('T')[0];

            if (dailyMap[dateKey]) {
                if (t.transactionType === 'income') {
                    dailyMap[dateKey].income += t.amount;
                } else {
                    dailyMap[dateKey].expense += t.amount;
                }
                dailyMap[dateKey].transactions.push(t);
            }
        });

        // Convert to array and sort by date
        const result = Object.values(dailyMap).sort((a, b) => a.date - b.date);



        return result;
    }

    // Function to handle daily transaction selection
    const handleDailyTransactionSelect = (day) => {
        setSelectedDailyTransactions(day.transactions);
        setSelectedDailyDate(day.date);
        setShowDailyTransactionsModal(true);
    };

    // Calculator functions
    const calculatorInputDigit = (digit) => {
        if (calculatorWaitingForOperand) {
            setCalculatorDisplay(String(digit));
            setCalculatorWaitingForOperand(false);
        } else {
            setCalculatorDisplay(calculatorDisplay === '0' ? String(digit) : calculatorDisplay + digit);
        }
    };

    const calculatorInputDecimal = () => {
        if (calculatorWaitingForOperand) {
            setCalculatorDisplay('0.');
            setCalculatorWaitingForOperand(false);
        } else if (calculatorDisplay.indexOf('.') === -1) {
            setCalculatorDisplay(calculatorDisplay + '.');
        }
    };

    const calculatorDelete = () => {
        if (calculatorDisplay.length > 1) {
            setCalculatorDisplay(calculatorDisplay.slice(0, -1));
        } else {
            setCalculatorDisplay('0');
        }
    };

    const calculatorClear = () => {
        setCalculatorDisplay('0');
        setCalculatorOperation(null);
        setCalculatorPreviousValue(null);
        setCalculatorWaitingForOperand(false);
    };

    const calculatorPerformOperation = (nextOperation) => {
        const inputValue = parseFloat(calculatorDisplay);

        if (calculatorPreviousValue === null) {
            setCalculatorPreviousValue(inputValue);
        } else if (calculatorOperation) {
            const currentValue = calculatorPreviousValue || 0;
            const newValue = calculatorOperations[calculatorOperation](currentValue, inputValue);

            setCalculatorDisplay(String(newValue));
            setCalculatorPreviousValue(newValue);

            // Add to history
            const historyEntry = `${currentValue} ${calculatorOperation} ${inputValue} = ${newValue}`;
            const newHistory = [...calculatorHistory, historyEntry];
            setCalculatorHistory(newHistory);
            saveCalculatorHistory(newHistory);
        }

        setCalculatorWaitingForOperand(true);
        setCalculatorOperation(nextOperation);
    };

    const calculatorOperations = {
        '/': (prevValue, nextValue) => prevValue / nextValue,
        '*': (prevValue, nextValue) => prevValue * nextValue,
        '+': (prevValue, nextValue) => prevValue + nextValue,
        '-': (prevValue, nextValue) => prevValue - nextValue,
        '=': (prevValue, nextValue) => nextValue,
    };

    const calculatorMemoryStore = () => {
        setCalculatorMemory(parseFloat(calculatorDisplay));
    };

    const calculatorMemoryRecall = () => {
        setCalculatorDisplay(String(calculatorMemory));
        setCalculatorWaitingForOperand(false);
    };

    const calculatorMemoryClear = () => {
        setCalculatorMemory(0);
    };

    const calculatorMemoryAdd = () => {
        setCalculatorMemory(calculatorMemory + parseFloat(calculatorDisplay));
    };

    const calculatorMemorySubtract = () => {
        setCalculatorMemory(calculatorMemory - parseFloat(calculatorDisplay));
    };





    // Load calculator history from AsyncStorage
    const loadCalculatorHistory = async () => {
        try {
            const savedHistory = await AsyncStorage.getItem('calculatorHistory');
            if (savedHistory) {
                setCalculatorHistory(JSON.parse(savedHistory));
            }
        } catch (error) {
            // Error loading calculator history
        }
    };

    // Save calculator history to AsyncStorage
    const saveCalculatorHistory = async (history) => {
        try {
            await AsyncStorage.setItem('calculatorHistory', JSON.stringify(history));
        } catch (error) {
            // Error saving calculator history
        }
    };

    // Enhanced clear history function
    const calculatorClearHistory = () => {
        setShowDeleteHistoryAlert(true);
    };

    const confirmDeleteHistory = () => {
        setCalculatorHistory([]);
        saveCalculatorHistory([]);
        setShowDeleteHistoryAlert(false);
    };

    // Calculate daysDiff and startDate at the top level
    const daysDiff = Math.ceil((dateRange.endDate - dateRange.startDate) / (1000 * 60 * 60 * 24)) + 1;
    const startDate = new Date(dateRange.startDate);





    // Calculate incomeData and expenseData at the top level - only when filters are applied
    let incomeData = [];
    let expenseData = [];
    if (filtersApplied && (chartMetric === 'net' || chartMetric === 'income' || chartMetric === 'expense')) {
        // Capture the current dateRange state to prevent it from changing during calculation
        const currentDateRange = {
            startDate: new Date(dateRange.startDate),
            endDate: new Date(dateRange.endDate)
        };
        // Calculate daysDiff fresh for chart calculation to avoid stale values
        const chartDaysDiff = Math.ceil((currentDateRange.endDate - currentDateRange.startDate) / (1000 * 60 * 60 * 24)) + 1;
        const isExactly7Days = chartDaysDiff === 7;
        const isExactly30Days = chartDaysDiff === 30;
        const isThisMonth = chartDaysDiff >= 28 && chartDaysDiff <= 31 &&
            currentDateRange.startDate && currentDateRange.endDate &&
            currentDateRange.startDate.getDate() === 1 &&
            currentDateRange.endDate.getDate() === new Date(currentDateRange.endDate.getFullYear(), currentDateRange.endDate.getMonth() + 1, 0).getDate();

        // Force daily view for exactly 7 days regardless of the calculated daysDiff
        // This ensures "Last 7 Days" always shows 7 bars
        const force7DaysView = isExactly7Days || (chartDaysDiff === 8 && currentDateRange.startDate && currentDateRange.endDate);

        // Force weekly view for exactly 30 days (Last 30 Days filter)
        const force30DaysView = isExactly30Days || (chartDaysDiff === 30 && currentDateRange.startDate && currentDateRange.endDate);


        if (chartDaysDiff <= 7 || isExactly7Days || force7DaysView) {
            // Daily view for exactly 7 days - Map to actual dates, not days of week
            const expensesArr = new Array(7).fill(0);
            const incomeArr = new Array(7).fill(0);
            filteredTransactions.forEach(t => {
                // Create transaction date in local time
                let transactionDate;
                if (t.dateDetails && t.dateDetails.date) {
                    // Use dateDetails.date which is already in local format (YYYY-MM-DD)
                    const [year, month, day] = t.dateDetails.date.split('-').map(Number);
                    transactionDate = new Date(year, month - 1, day, 0, 0, 0, 0); // month is 0-indexed
                } else {
                    // Use createdAt and convert to local date
                    transactionDate = new Date(t.createdAt);
                    transactionDate.setHours(0, 0, 0, 0); // Set to start of day in local time
                }

                // Calculate day index based on actual date difference from start date
                const dayDiff = Math.floor((transactionDate - currentDateRange.startDate) / (1000 * 60 * 60 * 24));
                const dayIdx = Math.max(0, Math.min(6, dayDiff)); // Clamp to 0-6 range

                if (t.transactionType === 'income') {
                    incomeArr[dayIdx] += t.amount;
                } else if (t.transactionType === 'expense') {
                    expensesArr[dayIdx] += t.amount;
                }
            });

            // Round to 2 decimal places like Stats component
            incomeData = incomeArr.map(val => Math.round(val * 100) / 100);
            expenseData = expensesArr.map(val => Math.round(val * 100) / 100);

            // try {
            //     console.log('[FiltersView] Daily amounts (7d):', {
            //         start: currentDateRange.startDate?.toISOString?.(),
            //         end: currentDateRange.endDate?.toISOString?.(),
            //         income: incomeData,
            //         expense: expenseData,
            //     });
            // } catch (e) { }



        } else if (chartDaysDiff <= 30 || force30DaysView) {
            // Weekly view for 30 days or when forced
            const weeksToShow = force30DaysView ? 5 : Math.ceil(chartDaysDiff / 7); // Force 5 weeks for 30 days

            for (let i = 0; i < weeksToShow; i++) {
                // Shift weekStart by +1 day to match label expectation (so 13-19 means 13th to 19th)
                const weekStart = new Date(currentDateRange.startDate);
                weekStart.setDate(currentDateRange.startDate.getDate() + (i * 7) + 1);
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekStart.getDate() + 6);

                // Clamp weekEnd to endDate
                if (weekEnd > currentDateRange.endDate) {
                    weekEnd.setTime(currentDateRange.endDate.getTime());
                }

                let weekIncome = 0;
                let weekExpense = 0;
                let weekTransactions = [];
                filteredTransactions.forEach(t => {
                    const tDate = t.dateDetails ? new Date(t.dateDetails.date + 'T00:00:00') : new Date(t.createdAt);
                    const isInWeek = tDate >= weekStart && tDate <= weekEnd;

                    if (t.transactionType === 'income' && isInWeek) {
                        weekIncome += t.amount;
                        weekTransactions.push({
                            id: t._id,
                            title: t.title,
                            amount: t.amount,
                            date: tDate.toISOString().split('T')[0],
                            type: 'income'
                        });
                    }
                    if (t.transactionType === 'expense' && isInWeek) {
                        weekExpense += t.amount;
                        weekTransactions.push({
                            id: t._id,
                            title: t.title,
                            amount: t.amount,
                            date: tDate.toISOString().split('T')[0],
                            type: 'expense'
                        });
                    }
                });

                incomeData.push(Math.round(weekIncome * 100) / 100);
                expenseData.push(Math.round(weekExpense * 100) / 100);
            }

            // try {
            //     console.log('[FiltersView] Weekly amounts (<=30d):', {
            //         start: currentDateRange.startDate?.toISOString?.(),
            //         end: currentDateRange.endDate?.toISOString?.(),
            //         income: incomeData,
            //         expense: expenseData,
            //     });
            // } catch (e) { }


        } else {
            // For periods longer than 30 days, use weekly view as fallback
            const weeksToShow = Math.ceil(chartDaysDiff / 7);
            for (let i = 0; i < weeksToShow; i++) {
                const weekStart = new Date(currentDateRange.startDate);
                weekStart.setDate(currentDateRange.startDate.getDate() + (i * 7));
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekStart.getDate() + 6);

                // Clamp weekEnd to endDate
                if (weekEnd > currentDateRange.endDate) {
                    weekEnd.setTime(currentDateRange.endDate.getTime());
                }

                let weekIncome = 0;
                let weekExpense = 0;
                filteredTransactions.forEach(t => {
                    const tDate = t.dateDetails ? new Date(t.dateDetails.date + 'T00:00:00') : new Date(t.createdAt);
                    if (t.transactionType === 'income' && tDate >= weekStart && tDate <= weekEnd) {
                        weekIncome += t.amount;
                    }
                    if (t.transactionType === 'expense' && tDate >= weekStart && tDate <= weekEnd) {
                        weekExpense += t.amount;
                    }
                });
                incomeData.push(Math.round(weekIncome * 100) / 100);
                expenseData.push(Math.round(weekExpense * 100) / 100);
            }

            // try {
            //     console.log('[FiltersView] Weekly amounts (>30d):', {
            //         start: currentDateRange.startDate?.toISOString?.(),
            //         end: currentDateRange.endDate?.toISOString?.(),
            //         income: incomeData,
            //         expense: expenseData,
            //     });
            // } catch (e) { }


        }
    }

    // Calculate chartLabels - only when filters are applied
    let chartLabels = [];
    if (filtersApplied) {
        // Use the same captured dateRange state as the data calculation to ensure consistency
        const currentDateRange = {
            startDate: new Date(dateRange.startDate),
            endDate: new Date(dateRange.endDate)
        };
        // Calculate daysDiff fresh for chart labels to avoid stale values
        const chartLabelsDaysDiff = Math.ceil((currentDateRange.endDate - currentDateRange.startDate) / (1000 * 60 * 60 * 24)) + 1;
        const isExactly7Days = chartLabelsDaysDiff === 7;
        const isExactly30Days = chartLabelsDaysDiff === 30;
        const isThisMonth = chartLabelsDaysDiff >= 28 && chartLabelsDaysDiff <= 31 &&
            currentDateRange.startDate && currentDateRange.endDate &&
            currentDateRange.startDate.getDate() === 1 &&
            currentDateRange.endDate.getDate() === new Date(currentDateRange.endDate.getFullYear(), currentDateRange.endDate.getMonth() + 1, 0).getDate();

        // Force daily view for exactly 7 days regardless of the calculated daysDiff
        const force7DaysView = isExactly7Days || (chartLabelsDaysDiff === 8 && currentDateRange.startDate && currentDateRange.endDate);

        // Force weekly view for exactly 30 days (Last 30 Days filter)
        const force30DaysView = isExactly30Days || (chartLabelsDaysDiff === 30 && currentDateRange.startDate && currentDateRange.endDate);

        if (chartLabelsDaysDiff <= 7 || isExactly7Days || force7DaysView) {
            // Generate labels for actual dates (Last 7 Days)
            chartLabels = [];
            for (let i = 0; i < 7; i++) {
                const date = new Date(currentDateRange.startDate);
                date.setDate(currentDateRange.startDate.getDate() + i);
                chartLabels.push(date.getDate().toString()); // Just show the day number
            }
        } else if (chartLabelsDaysDiff <= 30 || force30DaysView) {
            const weeksToShow = force30DaysView ? 5 : Math.ceil(chartLabelsDaysDiff / 7); // Force 5 weeks for 30 days

            for (let i = 0; i < weeksToShow; i++) {
                // For labels, we want to show the actual date range that users expect
                // The data calculation uses weekStart to weekEnd, so labels should match
                const weekStart = new Date(currentDateRange.startDate);
                weekStart.setDate(currentDateRange.startDate.getDate() + (i * 7));
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekStart.getDate() + 6);

                // Clamp weekEnd to endDate - same logic as data calculation
                if (weekEnd > currentDateRange.endDate) {
                    weekEnd.setTime(currentDateRange.endDate.getTime());
                }

                // Ensure we have valid dates and create proper labels
                // The labels should match the actual data range exactly
                // Use the same date calculation as the data to avoid timezone issues
                const startDay = weekStart.getDate();
                const endDay = weekEnd.getDate();



                if (startDay && endDay && startDay !== endDay) {
                    chartLabels.push(`${startDay}-${endDay}`);
                } else if (startDay) {
                    chartLabels.push(`${startDay}`);
                } else {
                    chartLabels.push(`Week ${i + 1}`);
                }
            }
        } else {
            // For periods longer than 31 days, use weekly labels as fallback
            const weeksToShow = Math.ceil(chartLabelsDaysDiff / 7);
            for (let i = 0; i < weeksToShow; i++) {
                const weekStart = new Date(currentDateRange.startDate);
                weekStart.setDate(currentDateRange.startDate.getDate() + (i * 7));
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekStart.getDate() + 6);

                // Clamp weekEnd to endDate
                if (weekEnd > currentDateRange.endDate) {
                    weekEnd.setTime(currentDateRange.endDate.getTime());
                }

                chartLabels.push(`${weekStart.getDate()}-${weekEnd.getDate()}`);
            }
        }

        // // Debug: date range and per-label values
        // try {
        //     console.log('[FiltersView] Chart range:', {
        //         start: currentDateRange.startDate?.toISOString?.(),
        //         end: currentDateRange.endDate?.toISOString?.(),
        //         days: chartLabelsDaysDiff,
        //         labels: chartLabels,
        //     });
        // } catch (e) { }
    }



    const chartData = {
        labels: chartLabels,
        datasets: [
            {
                data: (() => {
                    if (chartMetric === 'income') return incomeData;
                    if (chartMetric === 'expense') return expenseData;
                    if (chartMetric === 'net') return incomeData.map((v, i) => (v - (expenseData[i] || 0)));
                    return [];
                })(),
            },
        ],
    };

    const isValidDate = (date) => {
        return date instanceof Date && !isNaN(date.getTime());
    };

    const validateAndFixDateRange = (startDate, endDate) => {
        if (!isValidDate(startDate) || !isValidDate(endDate)) {
            // If dates are invalid, return today's date range
            const today = new Date();
            const fixedStart = new Date(today);
            const fixedEnd = new Date(today);
            fixedStart.setHours(0, 0, 0, 0);
            fixedEnd.setHours(23, 59, 59, 999);
            return { startDate: fixedStart, endDate: fixedEnd, wasFixed: true };
        }

        let fixedStart = new Date(startDate);
        let fixedEnd = new Date(endDate);
        let wasFixed = false;

        // Fix date order if start is after end
        if (fixedStart > fixedEnd) {
            [fixedStart, fixedEnd] = [fixedEnd, fixedStart];
            wasFixed = true;
        }

        // Fix future dates by clamping to today
        const today = new Date();
        today.setHours(23, 59, 59, 999);

        if (fixedStart > today) {
            fixedStart = new Date(today);
            fixedStart.setHours(0, 0, 0, 0);
            wasFixed = true;
        }

        if (fixedEnd > today) {
            fixedEnd = new Date(today);
            fixedEnd.setHours(23, 59, 59, 999);
            wasFixed = true;
        }

        // Fix excessive range by limiting to 365 days
        const maxRangeDays = 365;
        const daysDiff = Math.ceil((fixedEnd - fixedStart) / (1000 * 60 * 60 * 24));
        if (daysDiff > maxRangeDays) {
            fixedStart = new Date(fixedEnd);
            fixedStart.setDate(fixedEnd.getDate() - maxRangeDays + 1);
            fixedStart.setHours(0, 0, 0, 0);
            wasFixed = true;
        }

        return { startDate: fixedStart, endDate: fixedEnd, wasFixed };
    };

    const parseTransactionDate = (transaction) => {
        try {
            if (transaction.dateDetails?.date) {
                // Validate date format first
                const dateString = transaction.dateDetails.date;
                if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
                    throw new Error('Invalid date format');
                }

                const [year, month, day] = dateString.split('-').map(Number);
                const date = new Date(year, month - 1, day, 0, 0, 0, 0);

                if (!isValidDate(date)) {
                    throw new Error('Invalid date values');
                }

                return date;
            } else {
                const date = new Date(transaction.createdAt);
                if (!isValidDate(date)) {
                    throw new Error('Invalid createdAt date');
                }
                date.setHours(0, 0, 0, 0);
                return date;
            }
        } catch (error) {
            console.error('Error parsing transaction date:', error);
            // Return a fallback date or null
            return null;
        }
    };

    const safeDateComparison = (date1, date2) => {
        if (!isValidDate(date1) || !isValidDate(date2)) {
            return false;
        }

        // Compare only date parts, ignore time
        const d1 = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate());
        const d2 = new Date(date2.getFullYear(), date2.getMonth(), date2.getDate());

        return d1.getTime() === d2.getTime();
    };

    const safeDateRangeCheck = (date, startDate, endDate) => {
        if (!isValidDate(date) || !isValidDate(startDate) || !isValidDate(endDate)) {
            return false;
        }

        const checkDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const rangeStart = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
        const rangeEnd = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

        return checkDate >= rangeStart && checkDate <= rangeEnd;
    };

    // Dynamic smart date range functions
    const getLast7DaysRange = () => {
        const today = new Date();
        const weekAgo = new Date(today);
        weekAgo.setDate(today.getDate() - 6); // Subtract 6 days to get 7 days total

        // Set to start of day for weekAgo
        weekAgo.setHours(0, 0, 0, 0);
        // Set to end of day for today
        today.setHours(23, 59, 59, 999);

        return { startDate: weekAgo, endDate: today };
    };

    const getLast30DaysRange = () => {
        const today = new Date();
        const monthAgo = new Date(today);
        monthAgo.setDate(today.getDate() - 29); // Subtract 29 days to get 30 days total

        // Set to start of day for monthAgo
        monthAgo.setHours(0, 0, 0, 0);
        // Set to end of day for today
        today.setHours(23, 59, 59, 999);

        return { startDate: monthAgo, endDate: today };
    };

    const getThisMonthRange = () => {
        const today = new Date();
        const first = new Date(today.getFullYear(), today.getMonth(), 1);
        const last = new Date(today.getFullYear(), today.getMonth() + 1, 0);

        // Set to start of day for first
        first.setHours(0, 0, 0, 0);
        // Set to end of day for last
        last.setHours(23, 59, 59, 999);

        return { startDate: first, endDate: last };
    };

    const applySmartDateRange = (rangeType) => {
        try {
            let newDateRange;

            switch (rangeType) {
                case 'last7Days':
                    newDateRange = getLast7DaysRange();
                    break;
                case 'last30Days':
                    newDateRange = getLast30DaysRange();
                    break;
                case 'thisMonth':
                    newDateRange = getThisMonthRange();
                    break;
                default:
                    throw new Error('Invalid range type');
            }

            const fixedRange = validateAndFixDateRange(newDateRange.startDate, newDateRange.endDate);



            setDateRange({ startDate: fixedRange.startDate, endDate: fixedRange.endDate });
            setFiltersApplied(false); // Reset filters applied state
        } catch (error) {
            console.error(`Error applying ${rangeType}:`, error);
            // Fallback to today's date range if there's an error
            const today = new Date();
            const fallbackStart = new Date(today);
            const fallbackEnd = new Date(today);
            fallbackStart.setHours(0, 0, 0, 0);
            fallbackEnd.setHours(23, 59, 59, 999);
            setDateRange({ startDate: fallbackStart, endDate: fallbackEnd });
            setFiltersApplied(false);
        }
    };

    // Define constants for bar chart
    const BAR_CONTAINER_HEIGHT = 212;
    const BAR_TOP_GAP = 20; // Increased gap for more visible borderRadius
    const MAX_BAR_HEIGHT = BAR_CONTAINER_HEIGHT - BAR_TOP_GAP; // 192px

    // Safe date to ISO (yyyy-mm-dd)
    const toISODate = (d) => {
        try {
            if (!d) return undefined;
            const dt = d instanceof Date ? d : new Date(d);
            if (isNaN(dt.getTime())) return undefined;
            return dt.toISOString().split('T')[0];
        } catch {
            return undefined;
        }
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Ionicons name="arrow-back" size={24} color="#6C63FF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Filter Analytics</Text>
                <TouchableOpacity
                    style={styles.clearButton}
                    onPress={clearFilters}
                >
                    <Text style={styles.clearButtonText}>Clear</Text>
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Quick Stats */}
                <View style={styles.statsContainer}>
                    <View style={styles.statCard}>
                        <Text style={styles.statLabel}>Filtered Transactions</Text>
                        <Text style={styles.statValue}>{stats.count}</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statLabel}>Total Income</Text>
                        <Text style={[styles.statValue, { color: '#2e7d32' }]}>
                            ₹{stats.income.toLocaleString()}
                        </Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statLabel}>Total Expenses</Text>
                        <Text style={[styles.statValue, { color: '#c62828' }]}>
                            ₹{stats.expenses.toLocaleString()}
                        </Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statLabel}>Net</Text>
                        <Text style={[
                            styles.statValue,
                            { color: stats.net >= 0 ? '#2e7d32' : '#c62828' }
                        ]}>
                            ₹{stats.net.toLocaleString()}
                        </Text>
                    </View>
                </View>



                {/* Filters Section */}
                <View style={[
                    styles.filtersSection,
                    { marginBottom: 20 }
                ]}>
                    <Text style={styles.filtersSectionTitle}>Filters</Text>

                    {/* Date Range Filter */}
                    <View style={styles.filterSection}>
                        <Text style={styles.sectionTitle}>Date Range</Text>
                        <View style={styles.dateContainer}>
                            <TouchableOpacity
                                style={styles.dateButton}
                                onPress={() => setShowDatePicker(true)}
                            >
                                <Ionicons name="calendar-outline" size={20} color="#6C63FF" />
                                <Text style={styles.dateText}>
                                    {dateRange.startDate ? formatDate(dateRange.startDate) : 'Start'} - {dateRange.endDate ? formatDate(dateRange.endDate) : 'End'}
                                </Text>
                                <Ionicons name="chevron-down" size={16} color="#888" />
                            </TouchableOpacity>
                        </View>
                    </View>



                    {/* Category Filter */}
                    <View style={styles.filterSection}>
                        <Text style={styles.sectionTitle}>Categories</Text>
                        <View style={styles.chipContainer}>
                            {availableCategories.map(category => (
                                <TouchableOpacity
                                    key={category}
                                    style={[
                                        styles.chip,
                                        selectedCategories.includes(category) && styles.chipSelected
                                    ]}
                                    onPress={() => toggleCategory(category)}
                                >
                                    <Text style={[
                                        styles.chipText,
                                        selectedCategories.includes(category) && styles.chipTextSelected
                                    ]}>
                                        {category}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Bank Account Filter */}
                    {bankAccounts.length > 0 && (
                        <View style={styles.filterSection}>
                            <Text style={styles.sectionTitle}>Bank Accounts</Text>
                            <View style={styles.chipContainer}>
                                {bankAccounts.map(bankAccount => (
                                    <TouchableOpacity
                                        key={bankAccount._id}
                                        style={[
                                            styles.chip,
                                            selectedBankAccounts.includes(bankAccount._id) && styles.chipSelected
                                        ]}
                                        onPress={() => toggleBankAccount(bankAccount._id)}
                                    >
                                        <Ionicons
                                            name={bankAccount.accountType === 'savings' ? 'cash-outline' : 'card-outline'}
                                            size={16}
                                            color={selectedBankAccounts.includes(bankAccount._id) ? '#fff' : '#666'}
                                            style={{ marginRight: 6 }}
                                        />
                                        <Text style={[
                                            styles.chipText,
                                            selectedBankAccounts.includes(bankAccount._id) && styles.chipTextSelected
                                        ]}>
                                            {bankAccount.bankName}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    )}

                    {/* Amount Range Filter */}
                    <View style={styles.filterSection}>
                        <Text style={styles.sectionTitle}>Amount Range</Text>
                        <View style={styles.amountContainer}>
                            <View style={styles.amountInput}>
                                <Text style={styles.amountLabel}>Min</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="0"
                                    keyboardType="numeric"
                                    value={amountRange.min}
                                    onChangeText={(text) => setAmountRange(prev => ({ ...prev, min: text }))}
                                />
                            </View>
                            <View style={styles.amountInput}>
                                <Text style={styles.amountLabel}>Max</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="∞"
                                    keyboardType="numeric"
                                    value={amountRange.max}
                                    onChangeText={(text) => setAmountRange(prev => ({ ...prev, max: text }))}
                                />
                            </View>
                        </View>
                    </View>
                </View>

                {/* Smart Filter Presets */}
                <View style={[
                    styles.smartFiltersSection,
                    { marginBottom: filtersApplied ? 20 : 120 }
                ]}>
                    <Text style={styles.smartFiltersTitle}>Quick Filters</Text>
                    <View style={styles.smartFiltersGrid}>
                        <TouchableOpacity
                            style={styles.smartFilterChip}
                            onPress={() => {
                                const newAmountRange = { min: '1000', max: '' };
                                setAmountRange(newAmountRange);



                                // Apply filters with new values immediately
                                let filtered = [...transactions];
                                filtered = filtered.filter(t => {
                                    // Create transaction date in local time
                                    let transactionDate;
                                    if (t.dateDetails && t.dateDetails.date) {
                                        // Use dateDetails.date which is already in local format (YYYY-MM-DD)
                                        const [year, month, day] = t.dateDetails.date.split('-').map(Number);
                                        transactionDate = new Date(year, month - 1, day, 0, 0, 0, 0); // month is 0-indexed
                                    } else {
                                        // Use createdAt and convert to local date
                                        transactionDate = new Date(t.createdAt);
                                        transactionDate.setHours(0, 0, 0, 0); // Set to start of day in local time
                                    }
                                    return transactionDate >= dateRange.startDate && transactionDate <= dateRange.endDate;
                                });
                                if (selectedCategories.length > 0) {
                                    filtered = filtered.filter(t => selectedCategories.includes(t.category));
                                }
                                if (selectedBankAccounts.length > 0) {
                                    filtered = filtered.filter(t => {
                                        return t.bankAccount && selectedBankAccounts.includes(t.bankAccount._id || t.bankAccount);
                                    });
                                }
                                if (newAmountRange.min !== '') {
                                    filtered = filtered.filter(t => t.amount >= parseFloat(newAmountRange.min));
                                }
                                if (newAmountRange.max !== '') {
                                    filtered = filtered.filter(t => t.amount <= parseFloat(newAmountRange.max));
                                }



                                setFilteredTransactions(filtered);
                                setFiltersApplied(true);
                            }}
                        >
                            <Ionicons name="trending-up" size={16} color="#6C63FF" />
                            <Text style={styles.smartFilterText}>High Value (₹1000+)</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.smartFilterChip}
                            onPress={() => {
                                const newAmountRange = { min: '', max: '500' };
                                setAmountRange(newAmountRange);



                                // Apply filters with new values immediately
                                let filtered = [...transactions];
                                filtered = filtered.filter(t => {
                                    // Create transaction date in local time
                                    let transactionDate;
                                    if (t.dateDetails && t.dateDetails.date) {
                                        // Use dateDetails.date which is already in local format (YYYY-MM-DD)
                                        const [year, month, day] = t.dateDetails.date.split('-').map(Number);
                                        transactionDate = new Date(year, month - 1, day, 0, 0, 0, 0); // month is 0-indexed
                                    } else {
                                        // Use createdAt and convert to local date
                                        transactionDate = new Date(t.createdAt);
                                        transactionDate.setHours(0, 0, 0, 0); // Set to start of day in local time
                                    }
                                    return transactionDate >= dateRange.startDate && transactionDate <= dateRange.endDate;
                                });
                                if (selectedCategories.length > 0) {
                                    filtered = filtered.filter(t => selectedCategories.includes(t.category));
                                }
                                if (selectedBankAccounts.length > 0) {
                                    filtered = filtered.filter(t => {
                                        return t.bankAccount && selectedBankAccounts.includes(t.bankAccount._id || t.bankAccount);
                                    });
                                }
                                if (newAmountRange.min !== '') {
                                    filtered = filtered.filter(t => t.amount >= parseFloat(newAmountRange.min));
                                }
                                if (newAmountRange.max !== '') {
                                    filtered = filtered.filter(t => t.amount <= parseFloat(newAmountRange.max));
                                }



                                setFilteredTransactions(filtered);
                                setFiltersApplied(true);
                            }}
                        >
                            <Ionicons name="trending-down" size={16} color="#6C63FF" />
                            <Text style={styles.smartFilterText}>Small Expenses (₹500-)</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.smartFilterChip}
                            onPress={() => applySmartDateRange('last7Days')}
                        >
                            <Ionicons name="calendar" size={16} color="#6C63FF" />
                            <Text style={styles.smartFilterText}>Last 7 Days</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.smartFilterChip}
                            onPress={() => applySmartDateRange('last30Days')}
                        >
                            <Ionicons name="calendar-outline" size={16} color="#6C63FF" />
                            <Text style={styles.smartFilterText}>Last 30 Days</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.smartFilterChip}
                            onPress={() => applySmartDateRange('thisMonth')}
                        >
                            <Ionicons name="calendar" size={16} color="#6C63FF" />
                            <Text style={styles.smartFilterText}>This Month</Text>
                        </TouchableOpacity>
                    </View>
                </View>



                {/* View Filtered Transactions Section */}
                {filtersApplied && (
                    <View style={styles.viewTransactionsSection}>
                        <Text style={styles.viewTransactionsTitle}>View Filtered Data</Text>
                        <TouchableOpacity
                            style={styles.viewTransactionsButton}
                            onPress={() => {
                                setShowTransactionsModal(true);
                            }}
                        >
                            <Ionicons name="list-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                            <Text style={styles.viewTransactionsButtonText}>
                                View {filteredTransactions.length} Transactions
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Charts Section - Moved to Bottom */}
                {filtersApplied && (
                    <>
                        {/* Bar Chart Section */}
                        <View style={[styles.chartSection, {
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 6 },
                            shadowOpacity: 0.15,
                            shadowRadius: 12,
                            elevation: 8,
                        }]}>
                            <View style={styles.chartHeader}>
                                <Text style={styles.chartSectionTitle}>
                                    {(() => {
                                        const metricText = chartMetric === 'expense' ? 'Expenses' : chartMetric === 'income' ? 'Income' : 'Net';
                                        if (daysDiff <= 7) return `Daily ${metricText}`;
                                        if (daysDiff <= 30) return `Weekly ${metricText}`;
                                        if (daysDiff <= 60) return `Bi-Weekly ${metricText}`;
                                        if (daysDiff <= 90) return `Weekly ${metricText}`;
                                        return `Monthly ${metricText}`;
                                    })()}
                                </Text>

                                {/* Chart Controls */}
                                <View style={styles.chartControls}>
                                    {/* Metric Selector */}
                                    <View style={styles.chartControlGroup}>
                                        <Text style={styles.chartControlLabel}>Metric:</Text>
                                        <View style={styles.chartControlChips}>
                                            {['expense', 'income', 'net'].map(metric => (
                                                <TouchableOpacity
                                                    key={metric}
                                                    style={[
                                                        styles.chartControlChip,
                                                        chartMetric === metric && styles.chartControlChipSelected
                                                    ]}
                                                    onPress={() => setChartMetric(metric)}
                                                >
                                                    <Text style={[
                                                        styles.chartControlChipText,
                                                        chartMetric === metric && styles.chartControlChipTextSelected
                                                    ]}>
                                                        {metric.charAt(0).toUpperCase() + metric.slice(1)}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </View>
                                </View>
                            </View>

                            {/* Scrollable Chart Container */}
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={true}
                                contentContainerStyle={styles.chartScrollContainer}
                                bounces={false}
                            >
                                {(() => {
                                    // Use the top-level chartLabels and data consistently
                                    const chartConfig = {
                                        ...getChartConfig(chartData.datasets[0].data),
                                        formatYLabel: (value) => {
                                            const num = parseFloat(value);
                                            if (num >= 1000000) {
                                                return `₹${(num / 1000000).toFixed(2)}M`;
                                            }
                                            if (num >= 1000) {
                                                return `₹${(num / 1000).toFixed(2)}k`;
                                            }
                                            return `₹${num.toFixed(2)}`;
                                        }
                                    };

                                    if (chartMetric === 'net') {
                                        // For net metric, show income and expense in custom bar chart
                                        // Use the already calculated incomeData and expenseData from above

                                        const allVals = [...incomeData, ...expenseData];
                                        const max = Math.max(1, ...allVals);
                                        const niceMax = (() => {
                                            if (max <= 10) return 10;
                                            if (max <= 50) return Math.ceil(max / 10) * 10;
                                            if (max <= 100) return Math.ceil(max / 20) * 20;
                                            if (max <= 500) return Math.ceil(max / 50) * 50;
                                            if (max <= 1000) return Math.ceil(max / 100) * 100;
                                            const pow = Math.pow(10, Math.floor(Math.log10(max)));
                                            const n = Math.ceil(max / pow);
                                            if (n <= 2) return 2 * pow;
                                            if (n <= 5) return 5 * pow;
                                            return 10 * pow;
                                        })();

                                        return (
                                            <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 10 }}>
                                                <View style={{ flexDirection: 'row', alignItems: 'flex-end', width: '100%', minHeight: 220, marginTop: 0, marginBottom: 0 }}>
                                                    {/* Y-axis labels */}
                                                    <View style={{ justifyContent: 'space-between', height: MAX_BAR_HEIGHT, marginRight: 12, alignItems: 'flex-end' }}>
                                                        {[4, 3, 2, 1, 0].map(i => (
                                                            <Text key={i} style={{ fontSize: 13, color: '#888', fontWeight: '500' }}>
                                                                ₹{(Math.ceil(niceMax / 4) * i).toLocaleString()}
                                                            </Text>
                                                        ))}
                                                    </View>
                                                    {/* Custom bar chart */}
                                                    <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: BAR_CONTAINER_HEIGHT, flex: 1, justifyContent: 'space-between', paddingRight: 12, paddingLeft: 12 }}>
                                                        {chartLabels.map((label, i) => (
                                                            <TouchableOpacity
                                                                key={i}
                                                                activeOpacity={0.7}
                                                                onPress={() => {
                                                                    const nextIndex = selectedBarIndex === i ? null : i;
                                                                    if (nextIndex !== null) {
                                                                        const incomeVal = incomeData?.[i] ?? null;
                                                                        const expenseVal = expenseData?.[i] ?? null;
                                                                        const label = chartLabels?.[i];
                                                                        // console.log('[FiltersView] Bar press (net):', {
                                                                        //     index: i,
                                                                        //     label,
                                                                        //     income: incomeVal,
                                                                        //     expense: expenseVal,
                                                                        //     dateRange: {
                                                                        //         start: dateRange.startDate?.toISOString?.(),
                                                                        //         end: dateRange.endDate?.toISOString?.(),
                                                                        //     }
                                                                        // });

                                                                        // Detailed: expense of each day in the selected week
                                                                        try {
                                                                            const daily = getDailyBreakdown(i) || [];
                                                                            const dailyExpenses = daily.map(d => ({
                                                                                date: d.date?.toISOString?.().split('T')[0],
                                                                                expense: d.expense,
                                                                            }));
                                                                            // console.log('[FiltersView] Daily expenses for selected week:', dailyExpenses);
                                                                        } catch (e) { }
                                                                    }
                                                                    setSelectedBarIndex(nextIndex);
                                                                }}
                                                                style={{ alignItems: 'center', justifyContent: 'flex-end', height: BAR_CONTAINER_HEIGHT, width: 50, marginHorizontal: 3, paddingVertical: 4 }}
                                                            >
                                                                <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', width: '100%', height: BAR_CONTAINER_HEIGHT, marginTop: 0, paddingBottom: 4 }}>
                                                                    <View style={{
                                                                        width: 18,
                                                                        height: (incomeData[i] / niceMax) * MAX_BAR_HEIGHT,
                                                                        backgroundColor: '#4CAF50',
                                                                        borderRadius: 8,
                                                                        marginRight: 3,
                                                                        shadowColor: '#4CAF50',
                                                                        shadowOffset: { width: 0, height: 2 },
                                                                        shadowOpacity: 0.3,
                                                                        shadowRadius: 4,
                                                                        elevation: 4,
                                                                        borderWidth: 1,
                                                                        borderColor: '#45A049',
                                                                    }} />
                                                                    <View style={{
                                                                        width: 18,
                                                                        height: (expenseData[i] / niceMax) * MAX_BAR_HEIGHT,
                                                                        backgroundColor: '#F44336',
                                                                        borderRadius: 8,
                                                                        marginLeft: 3,
                                                                        shadowColor: '#F44336',
                                                                        shadowOffset: { width: 0, height: 2 },
                                                                        shadowOpacity: 0.3,
                                                                        shadowRadius: 4,
                                                                        elevation: 4,
                                                                        borderWidth: 1,
                                                                        borderColor: '#D32F2F',
                                                                    }} />
                                                                </View>
                                                                <Text style={{ fontSize: 13, color: '#888', marginTop: 6, textAlign: 'center', fontWeight: '500' }}>{label}</Text>
                                                            </TouchableOpacity>
                                                        ))}
                                                    </View>
                                                </View>
                                                {/* Legend */}
                                                <View style={{ flexDirection: 'row', marginTop: 20, alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 24 }}>
                                                        <View style={{
                                                            width: 18,
                                                            height: 18,
                                                            borderRadius: 6,
                                                            backgroundColor: '#4CAF50',
                                                            marginRight: 10,
                                                            shadowColor: '#4CAF50',
                                                            shadowOffset: { width: 0, height: 1 },
                                                            shadowOpacity: 0.3,
                                                            shadowRadius: 2,
                                                            elevation: 2,
                                                        }} />
                                                        <Text style={{ fontSize: 14, color: '#666', fontWeight: '600' }}>Income</Text>
                                                    </View>
                                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                        <View style={{
                                                            width: 18,
                                                            height: 18,
                                                            borderRadius: 6,
                                                            backgroundColor: '#F44336',
                                                            marginRight: 10,
                                                            shadowColor: '#F44336',
                                                            shadowOffset: { width: 0, height: 1 },
                                                            shadowOpacity: 0.3,
                                                            shadowRadius: 2,
                                                            elevation: 2,
                                                        }} />
                                                        <Text style={{ fontSize: 14, color: '#666', fontWeight: '600' }}>Expense</Text>
                                                    </View>
                                                </View>
                                            </View>
                                        );
                                    } else {
                                        // For expense and income metrics, show custom bar chart
                                        // Custom bar chart for single metric
                                        const singleData = chartData.datasets[0].data;
                                        const max = Math.max(1, ...singleData);
                                        const niceMax = (() => {
                                            if (max <= 10) return 10;
                                            if (max <= 50) return Math.ceil(max / 10) * 10;
                                            if (max <= 100) return Math.ceil(max / 20) * 20;
                                            if (max <= 500) return Math.ceil(max / 50) * 50;
                                            if (max <= 1000) return Math.ceil(max / 100) * 100;
                                            const pow = Math.pow(10, Math.floor(Math.log10(max)));
                                            const n = Math.ceil(max / pow);
                                            if (n <= 2) return 2 * pow;
                                            if (n <= 5) return 5 * pow;
                                            return 10 * pow;
                                        })();

                                        const barColor = chartMetric === 'income' ? '#4CAF50' : '#F44336';

                                        return (
                                            <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 10 }}>
                                                <View style={{ flexDirection: 'row', alignItems: 'flex-end', width: '100%', minHeight: BAR_CONTAINER_HEIGHT, marginTop: 0, marginBottom: 0 }}>
                                                    {/* Y-axis labels */}
                                                    <View style={{ justifyContent: 'space-between', height: MAX_BAR_HEIGHT, marginRight: 12, alignItems: 'flex-end' }}>
                                                        {[4, 3, 2, 1, 0].map(i => (
                                                            <Text key={i} style={{ fontSize: 13, color: '#888', fontWeight: '500' }}>
                                                                ₹{(Math.ceil(niceMax / 4) * i).toLocaleString()}
                                                            </Text>
                                                        ))}
                                                    </View>
                                                    {/* Custom bar chart */}
                                                    <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: BAR_CONTAINER_HEIGHT, flex: 1, justifyContent: 'space-between', paddingRight: 12, paddingLeft: 12 }}>
                                                        {chartLabels.map((label, i) => (
                                                            <TouchableOpacity
                                                                key={i}
                                                                activeOpacity={0.7}
                                                                onPress={() => {
                                                                    setSelectedBarIndex(selectedBarIndex === i ? null : i);
                                                                }}
                                                                style={{ alignItems: 'center', justifyContent: 'flex-end', height: BAR_CONTAINER_HEIGHT, width: 50, marginHorizontal: 3, paddingVertical: 4 }}
                                                            >
                                                                <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', width: '100%', height: BAR_CONTAINER_HEIGHT, marginTop: 0, paddingBottom: 4 }}>
                                                                    <View style={{
                                                                        width: 36,
                                                                        height: (singleData[i] / niceMax) * MAX_BAR_HEIGHT,
                                                                        backgroundColor: barColor,
                                                                        borderRadius: 10,
                                                                        shadowColor: barColor,
                                                                        shadowOffset: { width: 0, height: 3 },
                                                                        shadowOpacity: 0.4,
                                                                        shadowRadius: 6,
                                                                        elevation: 6,
                                                                        borderWidth: 1,
                                                                        borderColor: chartMetric === 'income' ? '#45A049' : '#D32F2F',
                                                                    }} />
                                                                </View>
                                                                <Text style={{ fontSize: 13, color: '#888', marginTop: 6, textAlign: 'center', fontWeight: '500' }}>{label}</Text>
                                                            </TouchableOpacity>
                                                        ))}
                                                    </View>
                                                </View>
                                                {/* Legend */}
                                                <View style={{ flexDirection: 'row', marginTop: 20, alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                        <View style={{
                                                            width: 18,
                                                            height: 18,
                                                            borderRadius: 6,
                                                            backgroundColor: barColor,
                                                            marginRight: 10,
                                                            shadowColor: barColor,
                                                            shadowOffset: { width: 0, height: 1 },
                                                            shadowOpacity: 0.3,
                                                            shadowRadius: 2,
                                                            elevation: 2,
                                                        }} />
                                                        <Text style={{ fontSize: 14, color: '#666', fontWeight: '600' }}>
                                                            {chartMetric === 'income' ? 'Income' : 'Expense'}
                                                        </Text>
                                                    </View>
                                                </View>
                                            </View>
                                        );
                                    }
                                })()}
                            </ScrollView>
                            {/* Details card for charts (outside scroll view) */}
                            {selectedBarIndex !== null && (
                                <View style={{
                                    backgroundColor: '#fff',
                                    borderRadius: 14,
                                    paddingVertical: 18,
                                    paddingHorizontal: 20,
                                    marginTop: 16,
                                    width: '100%',
                                    alignSelf: 'center',
                                    shadowColor: '#000',
                                    shadowOffset: { width: 0, height: 2 },
                                    shadowOpacity: 0.08,
                                    shadowRadius: 6,
                                    elevation: 2,
                                }}>
                                    {/* Period Summary */}
                                    <View style={{ alignItems: 'center', marginBottom: 16 }}>
                                        <Text style={{ fontSize: 15, fontWeight: 'bold', color: '#6C63FF', marginBottom: 8, textAlign: 'center' }}>{getDetailsCardLabel(selectedBarIndex)}</Text>
                                        {chartMetric === 'net' ? (
                                            <>
                                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 8 }}>
                                                    <View style={{ flex: 1, alignItems: 'center', marginRight: 10 }}>
                                                        <Text style={{ fontSize: 12, color: '#666', fontWeight: '500', marginBottom: 2 }}>Income</Text>
                                                        <Text style={{ fontSize: 16, color: '#2e7d32', fontWeight: 'bold' }}>₹{incomeData[selectedBarIndex]?.toLocaleString() ?? 0}</Text>
                                                    </View>
                                                    <View style={{ flex: 1, alignItems: 'center', marginLeft: 10 }}>
                                                        <Text style={{ fontSize: 12, color: '#666', fontWeight: '500', marginBottom: 2 }}>Expense</Text>
                                                        <Text style={{ fontSize: 16, color: '#c62828', fontWeight: 'bold' }}>₹{expenseData[selectedBarIndex]?.toLocaleString() ?? 0}</Text>
                                                    </View>
                                                </View>
                                                <View style={{
                                                    borderTopWidth: 1,
                                                    borderTopColor: '#e0e0e0',
                                                    paddingTop: 8,
                                                    width: '100%',
                                                    alignItems: 'center'
                                                }}>
                                                    <Text style={{ fontSize: 12, color: '#666', fontWeight: '500', marginBottom: 2 }}>Net</Text>
                                                    <Text style={{
                                                        fontSize: 18,
                                                        color: ((incomeData[selectedBarIndex] ?? 0) - (expenseData[selectedBarIndex] ?? 0)) >= 0 ? '#2e7d32' : '#c62828',
                                                        fontWeight: 'bold'
                                                    }}>
                                                        ₹{((incomeData[selectedBarIndex] ?? 0) - (expenseData[selectedBarIndex] ?? 0)).toLocaleString()}
                                                    </Text>
                                                </View>
                                            </>
                                        ) : (
                                            <Text style={{ fontSize: 18, color: chartMetric === 'income' ? '#2e7d32' : '#c62828', fontWeight: 'bold', textAlign: 'center' }}>
                                                ₹{(chartMetric === 'income' ? incomeData[selectedBarIndex] : expenseData[selectedBarIndex])?.toLocaleString() ?? 0}
                                            </Text>
                                        )}
                                    </View>

                                    {/* Daily Breakdown */}
                                    {(() => {
                                        const dailyBreakdown = getDailyBreakdown(selectedBarIndex);
                                        if (dailyBreakdown.length <= 1) return null; // Don't show breakdown for single day

                                        return (
                                            <View style={{ marginTop: 16 }}>
                                                <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#222', marginBottom: 12, textAlign: 'center' }}>Daily Breakdown</Text>
                                                <ScrollView
                                                    horizontal
                                                    showsHorizontalScrollIndicator={false}
                                                    style={{ maxHeight: 120 }}
                                                >
                                                    {dailyBreakdown.map((day, index) => (
                                                        <TouchableOpacity
                                                            key={index}
                                                            style={{
                                                                backgroundColor: '#f8f9fa',
                                                                borderRadius: 8,
                                                                padding: 12,
                                                                marginRight: 8,
                                                                minWidth: 80,
                                                                alignItems: 'center',
                                                                borderWidth: 1,
                                                                borderColor: '#e0e0e0',
                                                            }}
                                                            onPress={() => handleDailyTransactionSelect(day)}
                                                            activeOpacity={0.7}
                                                        >
                                                            <Text style={{ fontSize: 11, color: '#666', fontWeight: '500', marginBottom: 4 }}>
                                                                {day.date.toLocaleDateString('en-US', {
                                                                    month: 'short',
                                                                    day: 'numeric',
                                                                    weekday: 'short'
                                                                })}
                                                            </Text>
                                                            {chartMetric === 'net' || chartMetric === 'income' ? (
                                                                <Text style={{ fontSize: 12, color: '#2e7d32', fontWeight: 'bold', marginBottom: 2 }}>
                                                                    ₹{day.income.toLocaleString()}
                                                                </Text>
                                                            ) : null}
                                                            {chartMetric === 'net' || chartMetric === 'expense' ? (
                                                                <Text style={{ fontSize: 12, color: '#c62828', fontWeight: 'bold', marginBottom: 2 }}>
                                                                    ₹{day.expense.toLocaleString()}
                                                                </Text>
                                                            ) : null}
                                                            {chartMetric === 'net' ? (
                                                                <Text style={{
                                                                    fontSize: 11,
                                                                    color: (day.income - day.expense) >= 0 ? '#2e7d32' : '#c62828',
                                                                    fontWeight: 'bold'
                                                                }}>
                                                                    ₹{(day.income - day.expense).toLocaleString()}
                                                                </Text>
                                                            ) : null}
                                                            <Text style={{ fontSize: 10, color: '#888', marginTop: 2 }}>
                                                                {day.transactions.length} txns
                                                            </Text>
                                                        </TouchableOpacity>
                                                    ))}
                                                </ScrollView>
                                            </View>
                                        );
                                    })()}
                                </View>
                            )}
                        </View>

                        {/* Pie Chart Section */}
                        <View style={[styles.piechartSection, {
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 6 },
                            shadowOpacity: 0.15,
                            shadowRadius: 12,
                            elevation: 8,
                        }]}>
                            <Text style={styles.chartSectionTitle}>Expenses by Category</Text>
                            {(() => {
                                // Sum expenses per category
                                const catMap = {};
                                filteredTransactions.forEach(t => {
                                    if (t.transactionType === 'expense') {
                                        const cat = t.category || 'Other';
                                        catMap[cat] = (catMap[cat] || 0) + t.amount;
                                    }
                                });

                                const colors = ['#6C63FF', '#34a853', '#fbbc05', '#ea4335', '#888', '#b0b0b0', '#1ecb7b', '#ff4d4f', '#1976d2'];
                                const pieData = Object.keys(catMap).map((cat, i) => ({
                                    name: cat,
                                    amount: catMap[cat],
                                    color: colors[i % colors.length],
                                    percent: 0 // Will be calculated below
                                }));

                                // Calculate percentages
                                const total = pieData.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
                                pieData.forEach(item => {
                                    item.percent = total > 0 ? ((Number(item.amount) || 0) / total) * 100 : 0;
                                });

                                // Sort by amount (largest first)
                                pieData.sort((a, b) => b.amount - a.amount);

                                if (pieData.length === 0) {
                                    return (
                                        <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 20, alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
                                            <Ionicons name="pie-chart-outline" size={48} color="#ccc" />
                                            <Text style={{ fontSize: 16, color: '#888', marginTop: 12, fontWeight: '500' }}>No expense data</Text>
                                            <Text style={{ fontSize: 14, color: '#999', marginTop: 4, textAlign: 'center' }}>Add some expenses to see category breakdown</Text>
                                        </View>
                                    );
                                }

                                return (
                                    <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 10 }}>
                                        <View style={{ alignItems: 'center', width: '100%', justifyContent: 'center', minHeight: 280 }}>
                                            {/* Custom Donut Chart */}
                                            <View style={{ width: 220, height: 220, justifyContent: 'center', alignItems: 'center', position: 'relative', marginBottom: 20 }}>
                                                {(() => {
                                                    let startAngle = 0;
                                                    const gap = 4; // Gap between segments
                                                    return pieData.map((item, i) => {
                                                        const angle = (item.percent / 100) * 360 - gap;
                                                        if (angle <= 0) return null;

                                                        const endAngle = startAngle + angle;
                                                        const isSelected = selectedCategory === null || selectedCategory === item.name;

                                                        // Calculate SVG path for the segment
                                                        const radius = 90;
                                                        const centerX = 110;
                                                        const centerY = 110;

                                                        const startRad = (startAngle - 90) * Math.PI / 180;
                                                        const endRad = (endAngle - 90) * Math.PI / 180;

                                                        const x1 = centerX + radius * Math.cos(startRad);
                                                        const y1 = centerY + radius * Math.sin(startRad);
                                                        const x2 = centerX + radius * Math.cos(endRad);
                                                        const y2 = centerY + radius * Math.sin(endRad);

                                                        const largeArcFlag = angle > 180 ? 1 : 0;

                                                        const path = [
                                                            `M ${x1} ${y1}`,
                                                            `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                                                            'L 110 110',
                                                            'Z'
                                                        ].join(' ');

                                                        startAngle += angle + gap;

                                                        return (
                                                            <TouchableOpacity
                                                                key={i}
                                                                activeOpacity={0.7}
                                                                onPress={() => setSelectedCategory(selectedCategory === item.name ? null : item.name)}
                                                                style={{ position: 'absolute', width: 220, height: 220 }}
                                                            >
                                                                <Svg width={220} height={220}>
                                                                    <Path
                                                                        d={path}
                                                                        fill={item.color}
                                                                        opacity={isSelected ? 1 : 0.4}
                                                                    />
                                                                </Svg>
                                                            </TouchableOpacity>
                                                        );
                                                    });
                                                })()}

                                                {/* Donut hole */}
                                                <View style={{
                                                    width: 120,
                                                    height: 120,
                                                    borderRadius: 60,
                                                    backgroundColor: '#fff',
                                                    position: 'absolute',
                                                    top: 50,
                                                    left: 50,
                                                    zIndex: 2,
                                                    shadowColor: '#000',
                                                    shadowOffset: { width: 0, height: 2 },
                                                    shadowOpacity: 0.1,
                                                    shadowRadius: 4,
                                                    elevation: 2,
                                                }} />

                                                {/* Center label for selected category */}
                                                {selectedCategory && (() => {
                                                    const sel = pieData.find(p => p.name === selectedCategory);
                                                    if (!sel) return null;
                                                    return (
                                                        <View style={{ position: 'absolute', top: 85, left: 0, right: 0, alignItems: 'center', zIndex: 3 }}>
                                                            <Text style={{ fontSize: 16, fontWeight: 'bold', color: sel.color, textAlign: 'center' }}>{sel.name}</Text>
                                                            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#222', textAlign: 'center' }}>₹{sel.amount.toLocaleString()}</Text>
                                                            <Text style={{ fontSize: 14, color: '#888', fontWeight: '500', textAlign: 'center' }}>{sel.percent.toFixed(1)}%</Text>
                                                        </View>
                                                    );
                                                })()}
                                            </View>

                                            {/* Legend */}
                                            <View style={{ width: '100%', marginTop: 15 }}>
                                                <View style={{
                                                    flexDirection: 'row',
                                                    flexWrap: 'wrap',
                                                    paddingHorizontal: 10
                                                }}>
                                                    {pieData.map((item, i) => (
                                                        <TouchableOpacity
                                                            key={i}
                                                            activeOpacity={0.7}
                                                            onPress={() => setSelectedCategory(selectedCategory === item.name ? null : item.name)}
                                                            style={{
                                                                flexDirection: 'row',
                                                                alignItems: 'center',
                                                                marginRight: 8,
                                                                marginBottom: 8,
                                                                opacity: selectedCategory === null || selectedCategory === item.name ? 1 : 0.4,
                                                                paddingVertical: 6,
                                                                paddingHorizontal: 10,
                                                                borderRadius: 8,
                                                                backgroundColor: selectedCategory === item.name ? '#f8f9fa' : 'transparent',
                                                                borderWidth: 1,
                                                                borderColor: selectedCategory === item.name ? item.color : 'transparent',
                                                                shadowColor: selectedCategory === item.name ? item.color : 'transparent',
                                                                shadowOffset: { width: 0, height: 1 },
                                                                shadowOpacity: selectedCategory === item.name ? 0.15 : 0,
                                                                shadowRadius: 2,
                                                                elevation: selectedCategory === item.name ? 2 : 0,
                                                            }}
                                                        >
                                                            <View style={{
                                                                width: 12,
                                                                height: 12,
                                                                borderRadius: 3,
                                                                backgroundColor: item.color,
                                                                marginRight: 6,
                                                                shadowColor: item.color,
                                                                shadowOffset: { width: 0, height: 1 },
                                                                shadowOpacity: 0.3,
                                                                shadowRadius: 1,
                                                                elevation: 1,
                                                            }} />
                                                            <Text style={{ fontSize: 12, color: '#222', fontWeight: '600' }}>{item.name}</Text>
                                                        </TouchableOpacity>
                                                    ))}
                                                </View>
                                            </View>
                                        </View>

                                        {/* Show details card on category tap */}
                                        {selectedCategory && (() => {
                                            const sel = pieData.find(p => p.name === selectedCategory);
                                            if (!sel) return null;
                                            return (
                                                <View style={{
                                                    backgroundColor: '#fff',
                                                    borderRadius: 14,
                                                    paddingVertical: 16,
                                                    paddingHorizontal: 20,
                                                    marginTop: 16,
                                                    width: '100%',
                                                    alignSelf: 'center',
                                                    shadowColor: '#000',
                                                    shadowOffset: { width: 0, height: 2 },
                                                    shadowOpacity: 0.08,
                                                    shadowRadius: 6,
                                                    elevation: 2,
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                }}>
                                                    <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#6C63FF', marginBottom: 6, textAlign: 'center' }}>{sel.name}</Text>
                                                    <Text style={{ fontSize: 18, color: sel.color, fontWeight: 'bold', textAlign: 'center' }}>₹{sel.amount.toLocaleString()}</Text>
                                                    <Text style={{ fontSize: 14, color: '#666', marginTop: 4, textAlign: 'center' }}>{sel.percent.toFixed(1)}% of total expenses</Text>
                                                </View>
                                            );
                                        })()}
                                    </View>
                                );
                            })()}
                        </View>
                    </>
                )}
            </ScrollView>

            {/* Floating Action Buttons */}
            <View style={styles.floatingActionContainer}>
                {/* Calculator Button */}
                <TouchableOpacity
                    style={styles.calculatorFloatingButton}
                    onPress={() => setShowCalculator(true)}
                >
                    <Ionicons name="calculator-outline" size={24} color="#fff" />
                </TouchableOpacity>

                {/* Apply Filters Button */}
                <TouchableOpacity
                    style={styles.floatingApplyButton}
                    onPress={applyFilters}
                >
                    <Text style={styles.floatingApplyButtonText}>Apply Filters</Text>
                </TouchableOpacity>
            </View>

            {/* Date Picker Modal */}
            <Modal
                visible={showDatePicker}
                transparent={true}
                animationType="slide"
            >
                <GestureHandlerRootView style={{ flex: 1 }}>
                    <View style={styles.modalOverlay}>
                        <View style={styles.calendarCard}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Select Date Range</Text>
                                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                                    <Ionicons name="close" size={24} color="#888" />
                                </TouchableOpacity>
                            </View>

                            <PanGestureHandler
                                onGestureEvent={(event) => {
                                    const { translationX, state } = event.nativeEvent;

                                    if (state === State.END) {
                                        const swipeThreshold = 50;

                                        if (translationX > swipeThreshold) {
                                            // Swipe right - go to previous month
                                            setCalendarMonth(m => ({
                                                month: m.month === 0 ? 11 : m.month - 1,
                                                year: m.month === 0 ? m.year - 1 : m.year
                                            }));
                                        } else if (translationX < -swipeThreshold && !isCurrentMonth) {
                                            // Swipe left - go to next month (only if not current month)
                                            setCalendarMonth(m => ({
                                                month: m.month === 11 ? 0 : m.month + 1,
                                                year: m.month === 11 ? m.year + 1 : m.year
                                            }));
                                        }
                                    }
                                }}
                            >
                                <View>
                                    {/* Month navigation */}
                                    <View style={styles.monthNavRow}>
                                        <TouchableOpacity
                                            onPress={() => setCalendarMonth(m => ({
                                                month: m.month === 0 ? 11 : m.month - 1,
                                                year: m.month === 0 ? m.year - 1 : m.year
                                            }))}
                                        >
                                            <Ionicons name="chevron-back" size={24} color="#6C63FF" />
                                        </TouchableOpacity>
                                        <Text style={styles.monthNavText}>
                                            {MONTHS[calendarMonth.month]} {calendarMonth.year}
                                        </Text>
                                        <TouchableOpacity
                                            disabled={isCurrentMonth}
                                            style={isCurrentMonth ? { opacity: 0.3 } : null}
                                            onPress={() => {
                                                if (!isCurrentMonth) {
                                                    setCalendarMonth(m => ({
                                                        month: m.month === 11 ? 0 : m.month + 1,
                                                        year: m.month === 11 ? m.year + 1 : m.year
                                                    }));
                                                }
                                            }}
                                        >
                                            <Ionicons name="chevron-forward" size={24} color="#6C63FF" />
                                        </TouchableOpacity>
                                    </View>
                                    {/* Selected date pill */}
                                    <View style={styles.selectedDateRow}>
                                        <View style={styles.selectedDatePill}>
                                            <Text style={styles.selectedDatePillText}>
                                                {dateRange.startDate ? dateRange.startDate.toLocaleDateString('en-US', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }) : 'Start Date'}
                                            </Text>
                                            <View style={styles.closeButtonContainer}>
                                                {dateRange.startDate && (
                                                    <TouchableOpacity
                                                        style={styles.closeButton}
                                                        onPress={() => setDateRange(r => ({ ...r, startDate: null }))}
                                                    >
                                                        <Ionicons name="close-circle" size={18} color="#888" />
                                                    </TouchableOpacity>
                                                )}
                                            </View>
                                        </View>
                                        <Text style={styles.dateRangeSeparator}>to</Text>
                                        <View style={styles.selectedDatePill}>
                                            <Text style={styles.selectedDatePillText}>
                                                {dateRange.endDate ? dateRange.endDate.toLocaleDateString('en-US', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }) : 'End Date'}
                                            </Text>
                                            <View style={styles.closeButtonContainer}>
                                                {dateRange.endDate && (
                                                    <TouchableOpacity
                                                        style={styles.closeButton}
                                                        onPress={() => setDateRange(r => ({ ...r, endDate: null }))}
                                                    >
                                                        <Ionicons name="close-circle" size={18} color="#888" />
                                                    </TouchableOpacity>
                                                )}
                                            </View>
                                        </View>
                                    </View>
                                    {/* Weekday row */}
                                    <View style={styles.weekdayRow}>
                                        {WEEKDAYS.map((d, i) => (
                                            <Text key={i} style={styles.weekdayText}>{d}</Text>
                                        ))}
                                    </View>
                                    {/* Calendar grid */}
                                    <View style={styles.calendarGrid}>
                                        {getCalendarGrid(calendarMonth.month, calendarMonth.year).map((week, i) => (
                                            <View key={i} style={styles.calendarWeekRow}>
                                                {week.map((day, j) => {
                                                    const isSelected = isSameDay(day, dateRange.startDate) || isSameDay(day, dateRange.endDate);
                                                    const inRange = day && dateRange.startDate && dateRange.endDate && isInRange(day, dateRange.startDate, dateRange.endDate);
                                                    const isFuture = day && day > today;
                                                    const isCurrentMonth = day.getMonth() === calendarMonth.month;
                                                    const isOtherMonth = !isCurrentMonth;

                                                    return (
                                                        <TouchableOpacity
                                                            key={j}
                                                            style={[
                                                                styles.calendarDayCell,
                                                                isSelected && styles.calendarDaySelected,
                                                                inRange && styles.calendarDayInRange,
                                                                (isFuture || isOtherMonth) && { opacity: 0.3 }
                                                            ]}
                                                            disabled={!day || isFuture || isOtherMonth}
                                                            onPress={() => {
                                                                try {
                                                                    if (!dateRange.startDate || (dateRange.startDate && dateRange.endDate)) {
                                                                        // First selection or reset selection
                                                                        setDateRange({ startDate: day, endDate: null });
                                                                    } else if (dateRange.startDate && !dateRange.endDate) {
                                                                        // Second selection - complete the range
                                                                        const startDate = day < dateRange.startDate ? day : dateRange.startDate;
                                                                        const endDate = day < dateRange.startDate ? dateRange.startDate : day;

                                                                        const fixedRange = validateAndFixDateRange(startDate, endDate);

                                                                        setDateRange({ startDate: fixedRange.startDate, endDate: fixedRange.endDate });

                                                                    }
                                                                } catch (error) {
                                                                    console.error('Date selection error:', error);
                                                                    // Fallback to today's date range if there's an error
                                                                    const today = new Date();
                                                                    const fallbackStart = new Date(today);
                                                                    const fallbackEnd = new Date(today);
                                                                    fallbackStart.setHours(0, 0, 0, 0);
                                                                    fallbackEnd.setHours(23, 59, 59, 999);
                                                                    setDateRange({ startDate: fallbackStart, endDate: fallbackEnd });
                                                                }
                                                            }}
                                                        >
                                                            <Text style={[
                                                                styles.calendarDayText,
                                                                isSelected && styles.calendarDayTextSelected,
                                                                inRange && styles.calendarDayTextInRange,
                                                                (!day || isFuture || isOtherMonth) && { color: '#bbb' }
                                                            ]}>
                                                                {day ? day.getDate() : ''}
                                                            </Text>
                                                        </TouchableOpacity>
                                                    );
                                                })}
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            </PanGestureHandler>


                            <TouchableOpacity
                                style={styles.modalButton}
                                onPress={() => setShowDatePicker(false)}
                            >
                                <Text style={styles.modalButtonText}>Done</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </GestureHandlerRootView>
            </Modal>

            {/* Transactions Modal */}
            <Modal
                visible={showTransactionsModal}
                transparent={true}
                animationType="slide"
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.transactionsModalContent}>
                        <View style={styles.transactionsModalHeader}>
                            <Text style={styles.transactionsModalTitle}>Filtered Transactions ({filteredTransactions.length})</Text>
                            <TouchableOpacity
                                onPress={() => setShowTransactionsModal(false)}
                                style={styles.closeButton}
                            >
                                <Ionicons name="close" size={24} color="#888" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.transactionsModalBody}>
                            {filteredTransactions.length === 0 ? (
                                <View style={styles.emptyTransactionsState}>
                                    <Ionicons name="document-outline" size={48} color="#ccc" />
                                    <Text style={styles.emptyTransactionsTitle}>No Transactions Found</Text>
                                    <Text style={styles.emptyTransactionsText}>
                                        No transactions match your current filters. Try adjusting your filter criteria.
                                    </Text>
                                </View>
                            ) : (
                                <ScrollView
                                    style={styles.transactionsList}
                                    showsVerticalScrollIndicator={true}
                                    contentContainerStyle={{ paddingBottom: 20 }}
                                >
                                    {filteredTransactions.map((transaction, index) => (
                                        <TouchableOpacity
                                            key={transaction._id || index}
                                            style={styles.transactionItem}
                                            onPress={() => {
                                                setSelectedTransaction(transaction);
                                                setShowTransactionsModal(false);
                                                setShowFullDetails(true);
                                            }}
                                            activeOpacity={0.7}
                                        >
                                            <View style={styles.transactionLeft}>
                                                <View style={[
                                                    styles.transactionIcon,
                                                    { backgroundColor: transaction.transactionType === 'income' ? '#e8f5e8' : '#ffeaea' }
                                                ]}>
                                                    <Ionicons
                                                        name={transaction.transactionType === 'income' ? 'arrow-up' : 'arrow-down'}
                                                        size={16}
                                                        color={transaction.transactionType === 'income' ? '#2e7d32' : '#c62828'}
                                                    />
                                                </View>
                                                <View style={styles.transactionDetails}>
                                                    <Text style={styles.transactionTitle}>
                                                        {transaction.title || transaction.category || 'Transaction'}
                                                    </Text>
                                                    <Text style={styles.transactionCategory}>
                                                        {transaction.category || 'No Category'}
                                                    </Text>
                                                    <Text style={styles.transactionDate}>
                                                        {transaction.dateDetails ?
                                                            new Date(transaction.dateDetails.date).toLocaleDateString('en-US', {
                                                                year: 'numeric',
                                                                month: 'short',
                                                                day: 'numeric'
                                                            }) :
                                                            new Date(transaction.createdAt).toLocaleDateString('en-US', {
                                                                year: 'numeric',
                                                                month: 'short',
                                                                day: 'numeric'
                                                            })
                                                        }
                                                    </Text>
                                                </View>
                                            </View>
                                            <View style={styles.transactionRight}>
                                                <Text style={[
                                                    styles.transactionAmount,
                                                    { color: transaction.transactionType === 'income' ? '#2e7d32' : '#c62828' }
                                                ]}>
                                                    {transaction.transactionType === 'income' ? '+' : '-'}₹{transaction.amount.toLocaleString()}
                                                </Text>
                                            </View>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            )}
                        </View>

                        <TouchableOpacity
                            style={styles.closeModalButton}
                            onPress={() => setShowTransactionsModal(false)}
                        >
                            <Text style={styles.closeModalButtonText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Daily Transactions Modal */}
            <Modal
                visible={showDailyTransactionsModal}
                transparent={true}
                animationType="slide"
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.transactionsModalContent}>
                        <View style={styles.transactionsModalHeader}>
                            <Text style={styles.transactionsModalTitle}>
                                {selectedDailyDate ? selectedDailyDate.toLocaleDateString('en-US', {
                                    weekday: 'long',
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                }) : 'Daily Transactions'} ({selectedDailyTransactions.length})
                            </Text>
                            <TouchableOpacity
                                onPress={() => setShowDailyTransactionsModal(false)}
                                style={styles.closeButton}
                            >
                                <Ionicons name="close" size={24} color="#888" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.transactionsModalBody}>
                            {selectedDailyTransactions.length === 0 ? (
                                <View style={styles.emptyTransactionsState}>
                                    <Ionicons name="calendar-outline" size={48} color="#ccc" />
                                    <Text style={styles.emptyTransactionsTitle}>No Transactions</Text>
                                    <Text style={styles.emptyTransactionsText}>
                                        No transactions found for this date.
                                    </Text>
                                </View>
                            ) : (
                                <ScrollView
                                    style={styles.transactionsList}
                                    showsVerticalScrollIndicator={true}
                                    contentContainerStyle={{ paddingBottom: 20 }}
                                >
                                    {selectedDailyTransactions.map((transaction, index) => (
                                        <TouchableOpacity
                                            key={transaction._id || index}
                                            style={styles.transactionItem}
                                            onPress={() => {
                                                setSelectedTransaction(transaction);
                                                setShowDailyTransactionsModal(false);
                                                setShowFullDetails(true);
                                            }}
                                            activeOpacity={0.7}
                                        >
                                            <View style={styles.transactionLeft}>
                                                <View style={[
                                                    styles.transactionIcon,
                                                    { backgroundColor: transaction.transactionType === 'income' ? '#e8f5e8' : '#ffeaea' }
                                                ]}>
                                                    <Ionicons
                                                        name={transaction.transactionType === 'income' ? 'arrow-up' : 'arrow-down'}
                                                        size={16}
                                                        color={transaction.transactionType === 'income' ? '#2e7d32' : '#c62828'}
                                                    />
                                                </View>
                                                <View style={styles.transactionDetails}>
                                                    <Text style={styles.transactionTitle}>
                                                        {transaction.title || transaction.category || 'Transaction'}
                                                    </Text>
                                                    <Text style={styles.transactionCategory}>
                                                        {transaction.category || 'No Category'}
                                                    </Text>
                                                    <Text style={styles.transactionDate}>
                                                        {transaction.dateDetails ?
                                                            new Date(transaction.dateDetails.date).toLocaleTimeString('en-US', {
                                                                hour: '2-digit',
                                                                minute: '2-digit'
                                                            }) :
                                                            new Date(transaction.createdAt).toLocaleTimeString('en-US', {
                                                                hour: '2-digit',
                                                                minute: '2-digit'
                                                            })
                                                        }
                                                    </Text>
                                                </View>
                                            </View>
                                            <View style={styles.transactionRight}>
                                                <Text style={[
                                                    styles.transactionAmount,
                                                    { color: transaction.transactionType === 'income' ? '#2e7d32' : '#c62828' }
                                                ]}>
                                                    {transaction.transactionType === 'income' ? '+' : '-'}₹{transaction.amount.toLocaleString()}
                                                </Text>
                                            </View>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            )}
                        </View>

                        <TouchableOpacity
                            style={styles.closeModalButton}
                            onPress={() => setShowDailyTransactionsModal(false)}
                        >
                            <Text style={styles.closeModalButtonText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>





            {/* Custom Delete History Alert Modal */}
            <Modal
                visible={showDeleteHistoryAlert}
                transparent={true}
                animationType="fade"
            >
                <View style={styles.customAlertOverlay}>
                    <View style={styles.customAlertContainer}>
                        <View style={styles.customAlertIconContainer}>
                            <Ionicons name="trash-outline" size={32} color="#c62828" />
                        </View>
                        <Text style={styles.customAlertTitle}>Clear History</Text>
                        <Text style={styles.customAlertMessage}>
                            Are you sure you want to delete all calculator history?
                        </Text>
                        <Text style={styles.customAlertSubMessage}>
                            This action cannot be undone and will permanently remove all your calculation records.
                        </Text>
                        <View style={styles.customAlertButtons}>
                            <TouchableOpacity
                                style={[styles.customAlertButton, styles.customAlertButtonCancel]}
                                onPress={() => setShowDeleteHistoryAlert(false)}
                            >
                                <Text style={styles.customAlertButtonCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.customAlertButton, styles.customAlertButtonDelete]}
                                onPress={confirmDeleteHistory}
                            >
                                <Text style={styles.customAlertButtonDeleteText}>Delete All</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Calculator Modal - Now can be used alongside history modal */}
            <Modal
                visible={showCalculator}
                transparent={true}
                animationType="slide"
                statusBarTranslucent={true}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.calculatorModalContent}>
                        {/* Calculator Header */}
                        <View style={styles.calculatorHeader}>
                            <View style={styles.calculatorHeaderLeft}>
                                <Ionicons name="calculator" size={20} color="#FF6B35" />
                                <Text style={styles.calculatorHeaderTitle}>Financial Calculator</Text>
                            </View>
                            <View style={styles.calculatorHeaderRight}>
                                <TouchableOpacity
                                    style={styles.calculatorHeaderButton}
                                    onPress={() => setShowCalculator(false)}
                                >
                                    <Ionicons name="close" size={20} color="#666" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Calculator History - Expandable Section */}
                        {calculatorHistory.length > 0 && (
                            <View style={styles.calculatorHistoryContainer}>
                                <View style={styles.calculatorHistoryHeader}>
                                    <Text style={styles.calculatorHistoryTitle}>History</Text>
                                    <View style={styles.calculatorHistoryButtons}>
                                        <TouchableOpacity
                                            style={styles.calculatorHistoryButton}
                                            onPress={() => setCalculatorHistoryExpanded(!calculatorHistoryExpanded)}
                                        >
                                            <Ionicons
                                                name={calculatorHistoryExpanded ? "chevron-up" : "chevron-down"}
                                                size={16}
                                                color="#6C63FF"
                                            />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.calculatorHistoryButton}
                                            onPress={calculatorClearHistory}
                                        >
                                            <Ionicons name="trash-outline" size={16} color="#666" />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                                <ScrollView
                                    style={[
                                        styles.calculatorHistoryList,
                                        { maxHeight: calculatorHistoryExpanded ? 200 : 80 }
                                    ]}
                                    showsVerticalScrollIndicator={calculatorHistoryExpanded}
                                >
                                    {calculatorHistoryExpanded ?
                                        // Show all history when expanded
                                        calculatorHistory.slice().reverse().map((entry, index) => (
                                            <TouchableOpacity
                                                key={index}
                                                style={styles.calculatorHistoryEntryExpanded}
                                                onPress={() => {
                                                    // Extract the result from the history entry
                                                    const result = entry.split(' = ')[1];
                                                    if (result) {
                                                        setCalculatorDisplay(result);
                                                        setCalculatorWaitingForOperand(false);
                                                    }
                                                }}
                                                activeOpacity={0.7}
                                            >
                                                <Text style={styles.calculatorHistoryEntryText}>
                                                    {entry.split(' = ')[0]}
                                                </Text>
                                                <Text style={styles.calculatorHistoryEntryResult}>
                                                    = {entry.split(' = ')[1]}
                                                </Text>
                                            </TouchableOpacity>
                                        ))
                                        :
                                        // Show only last 5 entries when collapsed
                                        calculatorHistory.slice(-5).reverse().map((entry, index) => (
                                            <Text key={index} style={styles.calculatorHistoryEntry}>
                                                {entry}
                                            </Text>
                                        ))
                                    }
                                </ScrollView>
                            </View>
                        )}

                        {/* Calculator Display */}
                        <View style={styles.calculatorDisplayContainer}>
                            <Text style={styles.calculatorDisplay}>{calculatorDisplay}</Text>
                            {calculatorOperation && (
                                <Text style={styles.calculatorOperation}>
                                    {calculatorPreviousValue} {calculatorOperation}
                                </Text>
                            )}
                        </View>

                        {/* Memory Row */}
                        <View style={styles.calculatorMemoryRow}>
                            <TouchableOpacity
                                style={[styles.calculatorMemoryButton, calculatorMemory !== 0 && styles.calculatorMemoryButtonActive]}
                                onPress={calculatorMemoryStore}
                            >
                                <Text style={styles.calculatorMemoryButtonText}>MS</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.calculatorMemoryButton, calculatorMemory !== 0 && styles.calculatorMemoryButtonActive]}
                                onPress={calculatorMemoryRecall}
                            >
                                <Text style={styles.calculatorMemoryButtonText}>MR</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.calculatorMemoryButton, calculatorMemory !== 0 && styles.calculatorMemoryButtonActive]}
                                onPress={calculatorMemoryAdd}
                            >
                                <Text style={styles.calculatorMemoryButtonText}>M+</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.calculatorMemoryButton, calculatorMemory !== 0 && styles.calculatorMemoryButtonActive]}
                                onPress={calculatorMemorySubtract}
                            >
                                <Text style={styles.calculatorMemoryButtonText}>M-</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.calculatorMemoryButton, calculatorMemory !== 0 && styles.calculatorMemoryButtonActive]}
                                onPress={calculatorMemoryClear}
                            >
                                <Text style={styles.calculatorMemoryButtonText}>MC</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Calculator Keypad - Moved to Bottom for Easy Access */}
                        <View style={styles.calculatorKeypad}>
                            {/* Row 1: Clear, History, %, ÷ */}
                            <View style={styles.calculatorRow}>
                                <TouchableOpacity
                                    style={[styles.calculatorButton, styles.calculatorButtonSecondary]}
                                    onPress={calculatorClear}
                                >
                                    <Text style={styles.calculatorButtonText}>C</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.calculatorButton, styles.calculatorButtonSecondary]}
                                    onPress={() => calculatorPerformOperation('/')}
                                >
                                    <Text style={styles.calculatorButtonText}>÷</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.calculatorButton, styles.calculatorButtonSecondary]}
                                    onPress={() => calculatorPerformOperation('*')}
                                >
                                    <Text style={styles.calculatorButtonText}>×</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.calculatorButton, styles.calculatorButtonSecondary]}
                                    onPress={() => calculatorPerformOperation('-')}
                                >
                                    <Text style={styles.calculatorButtonText}>-</Text>
                                </TouchableOpacity>
                            </View>

                            {/* Row 2: 7, 8, 9, + */}
                            <View style={styles.calculatorRow}>
                                <TouchableOpacity
                                    style={styles.calculatorButton}
                                    onPress={() => calculatorInputDigit(7)}
                                >
                                    <Text style={styles.calculatorButtonText}>7</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.calculatorButton}
                                    onPress={() => calculatorInputDigit(8)}
                                >
                                    <Text style={styles.calculatorButtonText}>8</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.calculatorButton}
                                    onPress={() => calculatorInputDigit(9)}
                                >
                                    <Text style={styles.calculatorButtonText}>9</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.calculatorButton, styles.calculatorButtonSecondary]}
                                    onPress={() => calculatorPerformOperation('+')}
                                >
                                    <Text style={styles.calculatorButtonText}>+</Text>
                                </TouchableOpacity>
                            </View>

                            {/* Row 3: 4, 5, 6, = */}
                            <View style={styles.calculatorRow}>
                                <TouchableOpacity
                                    style={styles.calculatorButton}
                                    onPress={() => calculatorInputDigit(4)}
                                >
                                    <Text style={styles.calculatorButtonText}>4</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.calculatorButton}
                                    onPress={() => calculatorInputDigit(5)}
                                >
                                    <Text style={styles.calculatorButtonText}>5</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.calculatorButton}
                                    onPress={() => calculatorInputDigit(6)}
                                >
                                    <Text style={styles.calculatorButtonText}>6</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.calculatorButton, styles.calculatorButtonSecondary]}
                                    onPress={() => calculatorPerformOperation('=')}
                                >
                                    <Text style={styles.calculatorButtonText}>=</Text>
                                </TouchableOpacity>
                            </View>

                            {/* Row 4: 1, 2, 3, Delete */}
                            <View style={styles.calculatorRow}>
                                <TouchableOpacity
                                    style={styles.calculatorButton}
                                    onPress={() => calculatorInputDigit(1)}
                                >
                                    <Text style={styles.calculatorButtonText}>1</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.calculatorButton}
                                    onPress={() => calculatorInputDigit(2)}
                                >
                                    <Text style={styles.calculatorButtonText}>2</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.calculatorButton}
                                    onPress={() => calculatorInputDigit(3)}
                                >
                                    <Text style={styles.calculatorButtonText}>3</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.calculatorButton, styles.calculatorButtonSecondary]}
                                    onPress={calculatorDelete}
                                >
                                    <Text style={styles.calculatorButtonText}>Del</Text>
                                </TouchableOpacity>
                            </View>

                            {/* Row 5: 0, ., 00 */}
                            <View style={styles.calculatorRow}>
                                <TouchableOpacity
                                    style={[styles.calculatorButton, styles.calculatorButtonZero]}
                                    onPress={() => calculatorInputDigit(0)}
                                >
                                    <Text style={styles.calculatorButtonText}>0</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.calculatorButton}
                                    onPress={calculatorInputDecimal}
                                >
                                    <Text style={styles.calculatorButtonText}>.</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.calculatorButton}
                                    onPress={() => {
                                        if (calculatorWaitingForOperand) {
                                            setCalculatorDisplay('00');
                                            setCalculatorWaitingForOperand(false);
                                        } else {
                                            setCalculatorDisplay(calculatorDisplay === '0' ? '00' : calculatorDisplay + '00');
                                        }
                                    }}
                                >
                                    <Text style={styles.calculatorButtonText}>00</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Full Transaction Details Screen */}
            <TransactionDetailsScreen
                visible={showFullDetails}
                transactionData={{
                    title: selectedTransaction?.title,
                    amount: selectedTransaction?.amount,
                    category: selectedTransaction?.category,
                    transactionId: selectedTransaction?._id,
                    bankAccount: selectedTransaction?.bankAccount?.bankName || 'N/A',
                    status: selectedTransaction?.paymentStatus || 'completed',
                    date: selectedTransaction?.createdAt,
                    groupName: selectedTransaction?.group?.name || null,
                    contactName: selectedTransaction?.contact?.firstName && selectedTransaction?.contact?.lastName
                        ? `${selectedTransaction.contact.firstName} ${selectedTransaction.contact.lastName}`.trim()
                        : selectedTransaction?.contact?.phone || null,
                    paidBy: selectedTransaction?.paidBy ?
                        (String(selectedTransaction.paidBy._id || selectedTransaction.paidBy) === String(userId) ? 'You' : `${selectedTransaction.paidBy.firstName || ''} ${selectedTransaction.paidBy.lastName || ''}`.trim())
                        : null,
                    members: selectedTransaction?.splitBetween ?
                        selectedTransaction.splitBetween.map(user =>
                            String(user._id || user) === String(userId) ? 'You' : `${user.firstName || ''} ${user.lastName || ''}`.trim()
                        )
                        : null,
                }}
                onClose={() => setShowFullDetails(false)}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f6fa',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 50,
        paddingBottom: 20,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#222',
    },
    clearButton: {
        padding: 8,
    },
    clearButtonText: {
        color: '#6C63FF',
        fontWeight: '600',
    },
    // Smart filters styles
    smartFiltersSection: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    smartFiltersTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#222',
        marginBottom: 12,
    },
    smartFiltersGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    smartFilterChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8f9fa',
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        marginBottom: 8,
    },
    smartFilterText: {
        fontSize: 12,
        color: '#666',
        marginLeft: 6,
        fontWeight: '500',
    },
    content: {
        flex: 1,
        padding: 20,
        paddingBottom: 300,
    },
    statsSection: {
        backgroundColor: '#fff',
        borderRadius: 12,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    statsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
    },
    statsHeaderTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#222',
    },
    statsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        paddingHorizontal: 0,
        paddingBottom: 20,
        marginBottom: 20,
    },
    chartSection: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    viewTransactionsSection: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    viewTransactionsTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#222',
        marginBottom: 12,
    },
    viewTransactionsButton: {
        backgroundColor: '#6C63FF',
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#6C63FF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    viewTransactionsButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    piechartSection: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 120,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    chartSectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#222',
        marginBottom: 8,
    },
    chartHeader: {
        marginBottom: 16,
    },
    chartControls: {
        marginTop: 12,
        marginBottom: 18, // Added extra space below metric selector
    },
    chartControlGroup: {
        marginBottom: 10,
    },
    chartControlLabel: {
        fontSize: 12,
        color: '#666',
        marginBottom: 4,
        fontWeight: '600',
    },
    chartControlChips: {
        flexDirection: 'row',
        gap: 8,
    },
    chartControlChip: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        backgroundColor: '#f8f9fa',
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    chartControlChipSelected: {
        backgroundColor: '#6C63FF',
        borderColor: '#6C63FF',
    },
    chartControlChipText: {
        fontSize: 11,
        color: '#666',
    },
    chartControlChipTextSelected: {
        color: '#fff',
        fontWeight: '600',
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 40,
        paddingHorizontal: 20,
    },
    emptyStateTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#666',
        marginTop: 12,
        marginBottom: 8,
    },
    emptyStateText: {
        fontSize: 14,
        color: '#888',
        textAlign: 'center',
        marginBottom: 8,
    },
    emptyStateSuggestion: {
        fontSize: 12,
        color: '#999',
        textAlign: 'center',
        fontStyle: 'italic',
    },
    filtersSection: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    filtersSectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#222',
        marginBottom: 16,
    },
    statCard: {
        flex: 1,
        minWidth: '45%',
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
        marginBottom: 0,
    },
    statLabel: {
        fontSize: 13,
        color: '#666',
        marginBottom: 6,
        fontWeight: '500',
        textAlign: 'center',
    },
    statValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#222',
        textAlign: 'center',
    },
    filterSection: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#222',
        marginBottom: 12,
    },
    dateContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    dateButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
        padding: 12,
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    dateText: {
        flex: 1,
        marginLeft: 8,
        fontSize: 14,
        color: '#222',
    },
    chipContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    chip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        backgroundColor: '#f8f9fa',
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    chipSelected: {
        backgroundColor: '#6C63FF',
        borderColor: '#6C63FF',
    },
    chipText: {
        fontSize: 12,
        color: '#666',
    },
    chipTextSelected: {
        color: '#fff',
        fontWeight: '600',
    },
    amountContainer: {
        flexDirection: 'row',
        gap: 12,
    },
    amountInput: {
        flex: 1,
    },
    amountLabel: {
        fontSize: 12,
        color: '#666',
        marginBottom: 4,
    },
    input: {
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
        padding: 12,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        fontSize: 14,
    },
    applyButton: {
        backgroundColor: '#6C63FF',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        marginTop: 20,
    },
    applyButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    floatingActionContainer: {
        position: 'absolute',
        bottom: 30,
        left: 20,
        right: 20,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        zIndex: 1000,
    },
    calculatorFloatingButton: {
        width: 56,
        height: 56,
        backgroundColor: '#FF6B35',
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#FF6B35',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    floatingApplyButton: {
        flex: 1,
        backgroundColor: '#6C63FF',
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 8,
    },
    floatingApplyButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },

    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#222',
    },
    modalText: {
        fontSize: 14,
        color: '#666',
        marginBottom: 20,
    },
    modalButton: {
        backgroundColor: '#6C63FF',
        borderRadius: 8,
        padding: 12,
        alignItems: 'center',
    },
    modalButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    datePickerContainer: {
        marginBottom: 20,
    },
    datePickerSection: {
        marginBottom: 15,
    },
    datePickerLabel: {
        fontSize: 14,
        color: '#666',
        marginBottom: 8,
    },
    dateInput: {
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
        padding: 12,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        fontSize: 14,
    },

    calendarCard: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 20,
        margin: 18,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 10,
        borderWidth: 1,
        borderColor: '#f0f0f0',
    },
    selectedDateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    selectedDatePill: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#f5f6fa',
        borderRadius: 18,
        paddingHorizontal: 16,
        paddingVertical: 10,
        marginHorizontal: 4,
        minWidth: 140,
        minHeight: 44,
        shadowColor: '#6C63FF',
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 1,
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    selectedDatePillText: {
        fontSize: 14,
        color: '#222',
        fontWeight: '600',
        flex: 1,
        textAlign: 'center',
    },
    closeButtonContainer: {
        width: 24,
        height: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    closeButton: {
        padding: 2,
    },
    dateRangeSeparator: {
        marginHorizontal: 12,
        fontWeight: 'bold',
        color: '#888',
        fontSize: 16,
    },
    selectMonthButton: {
        backgroundColor: '#f5f6fa',
        borderRadius: 16,
        paddingHorizontal: 12,
        paddingVertical: 6,
        marginLeft: 8,
        shadowColor: '#6C63FF',
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 1,
    },
    selectMonthButtonText: {
        color: '#6C63FF',
        fontWeight: 'bold',
        fontSize: 14,
    },
    monthNavRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
        paddingHorizontal: 8,
    },
    monthNavText: {
        fontWeight: 'bold',
        fontSize: 20,
        color: '#222',
        flex: 1,
        textAlign: 'center',
    },
    weekdayRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
        paddingHorizontal: 4,
    },
    weekdayText: {
        flex: 1,
        textAlign: 'center',
        color: '#666',
        fontWeight: '600',
        fontSize: 14,
        paddingVertical: 8,
    },
    calendarGrid: {
        marginBottom: 16,
    },
    calendarWeekRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    calendarDayCell: {
        flex: 1,
        aspectRatio: 1,
        alignItems: 'center',
        justifyContent: 'center',
        margin: 3,
        borderRadius: 20,
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: 'transparent',
        minHeight: 40,
        minWidth: 40,
    },
    calendarDaySelected: {
        backgroundColor: '#6C63FF',
        borderColor: '#6C63FF',
        shadowColor: '#6C63FF',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 4,
    },
    calendarDayInRange: {
        backgroundColor: '#eaf0ff',
        borderColor: '#6C63FF',
    },
    calendarDayText: {
        fontSize: 16,
        color: '#222',
        fontWeight: '600',
    },
    calendarDayTextSelected: {
        color: '#fff',
        fontWeight: 'bold',
    },
    calendarDayTextInRange: {
        color: '#6C63FF',
        fontWeight: '600',
    },
    chartScrollContainer: {
        paddingHorizontal: 10,
        minWidth: '100%',
        alignItems: 'center',
        paddingBottom: 10,
    },
    // Transactions Modal Styles
    transactionsModalContent: {
        backgroundColor: '#fff',
        borderRadius: 20,
        margin: 20,
        width: '90%',
        maxHeight: '90%',
        minHeight: '70%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
    },
    transactionsModalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    transactionsModalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#222',
    },
    closeButton: {
        padding: 4,
    },
    transactionsModalBody: {
        flex: 1,
        paddingHorizontal: 20,
        minHeight: 300,
    },
    emptyTransactionsState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
        paddingHorizontal: 20,
    },
    emptyTransactionsTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#666',
        marginTop: 16,
        marginBottom: 8,
    },
    emptyTransactionsText: {
        fontSize: 14,
        color: '#888',
        textAlign: 'center',
        lineHeight: 20,
    },
    transactionsList: {
        flex: 1,
        paddingVertical: 10,
        minHeight: 200,
    },
    transactionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        paddingHorizontal: 0,
        borderBottomWidth: 1,
        borderBottomColor: '#f8f9fa',
        borderRadius: 8,
        marginVertical: 2,
    },
    transactionLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    transactionIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    transactionDetails: {
        flex: 1,
    },
    transactionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#222',
        marginBottom: 2,
    },
    transactionCategory: {
        fontSize: 13,
        color: '#666',
        marginBottom: 2,
    },
    transactionDate: {
        fontSize: 12,
        color: '#888',
    },
    transactionRight: {
        alignItems: 'flex-end',
    },
    transactionAmount: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    closeModalButton: {
        backgroundColor: '#6C63FF',
        borderRadius: 12,
        paddingVertical: 14,
        margin: 20,
        alignItems: 'center',
        shadowColor: '#6C63FF',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
    },
    closeModalButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    // Calculator Styles
    calculatorModalContent: {
        backgroundColor: '#fff',
        borderRadius: 20,
        margin: 20,
        width: '90%',
        maxHeight: '90%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
    },

    calculatorHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    calculatorHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    calculatorHeaderTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#222',
        marginLeft: 8,
    },
    calculatorHeaderRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    calculatorHeaderButton: {
        padding: 8,
        marginLeft: 8,
    },
    calculatorDisplayContainer: {
        backgroundColor: '#f8f9fa',
        padding: 20,
        alignItems: 'flex-end',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    calculatorDisplay: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#222',
        textAlign: 'right',
    },
    calculatorOperation: {
        fontSize: 16,
        color: '#666',
        marginTop: 4,
    },
    calculatorMemoryRow: {
        flexDirection: 'row',
        padding: 8,
        backgroundColor: '#f8f9fa',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    calculatorMemoryButton: {
        flex: 1,
        paddingVertical: 8,
        paddingHorizontal: 4,
        marginHorizontal: 2,
        borderRadius: 6,
        backgroundColor: '#e0e0e0',
        alignItems: 'center',
    },
    calculatorMemoryButtonActive: {
        backgroundColor: '#FF6B35',
    },
    calculatorMemoryButtonText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#666',
    },
    calculatorKeypad: {
        padding: 16,
    },
    calculatorRow: {
        flexDirection: 'row',
        marginBottom: 8,
    },
    calculatorButton: {
        flex: 1,
        height: 50,
        marginHorizontal: 4,
        borderRadius: 12,
        backgroundColor: '#f8f9fa',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    calculatorButtonSecondary: {
        backgroundColor: '#e0e0e0',
    },
    calculatorButtonEquals: {
        backgroundColor: '#6C63FF',
    },

    calculatorButtonZero: {
        flex: 2,
    },
    calculatorButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#222',
    },
    calculatorHistoryContainer: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
        backgroundColor: '#f8f9fa',
    },
    calculatorHistoryHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    calculatorHistoryTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#222',
    },
    calculatorHistoryButtons: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    calculatorHistoryButton: {
        padding: 8,
        marginLeft: 4,
    },
    calculatorHistoryList: {
        maxHeight: 100,
    },
    calculatorHistoryEntry: {
        fontSize: 12,
        color: '#666',
        paddingVertical: 2,
        fontFamily: 'monospace',
    },
    calculatorHistoryEntryExpanded: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        marginVertical: 2,
        borderRadius: 8,
        backgroundColor: '#f8f9fa',
        borderWidth: 1,
        borderColor: '#e9ecef',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    calculatorHistoryEntryText: {
        fontSize: 13,
        color: '#495057',
        fontFamily: 'monospace',
        marginBottom: 4,
        fontWeight: '500',
    },
    calculatorHistoryEntryResult: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1a1a1a',
        fontFamily: 'monospace',
        letterSpacing: 0.3,
    },
    // Custom Alert Styles
    customAlertOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    customAlertContainer: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 24,
        width: '100%',
        maxWidth: 320,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 12,
        borderWidth: 1,
        borderColor: '#f0f0f0',
    },
    customAlertIconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#ffebee',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
        shadowColor: '#c62828',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    customAlertTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1a1a1a',
        marginBottom: 12,
        textAlign: 'center',
        letterSpacing: 0.3,
    },
    customAlertMessage: {
        fontSize: 16,
        color: '#333',
        textAlign: 'center',
        marginBottom: 8,
        lineHeight: 22,
        fontWeight: '500',
    },
    customAlertSubMessage: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 20,
        fontStyle: 'italic',
    },
    customAlertButtons: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    customAlertButton: {
        flex: 1,
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    customAlertButtonCancel: {
        backgroundColor: '#f8f9fa',
        borderWidth: 1,
        borderColor: '#e9ecef',
    },
    customAlertButtonDelete: {
        backgroundColor: '#c62828',
        borderWidth: 1,
        borderColor: '#b71c1c',
    },
    customAlertButtonCancelText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#666',
    },
    customAlertButtonDeleteText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
});

export default FiltersView;
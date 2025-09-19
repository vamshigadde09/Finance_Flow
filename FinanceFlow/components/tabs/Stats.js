import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, RefreshControl, Dimensions, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Svg, { G, Path, Circle, Rect } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';

import { API_BASE_URL } from '../../api';

const AnimatedRect = Animated.createAnimatedComponent(Rect);

// Skeleton Loading Components
const SkeletonBox = ({ width, height, style }) => {
    const [skeletonOpacity] = React.useState(new Animated.Value(0.3));

    React.useEffect(() => {
        const animateSkeleton = () => {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(skeletonOpacity, {
                        toValue: 1,
                        duration: 800,
                        useNativeDriver: true,
                    }),
                    Animated.timing(skeletonOpacity, {
                        toValue: 0.3,
                        duration: 800,
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        };

        animateSkeleton();

        return () => {
            skeletonOpacity.stopAnimation();
        };
    }, [skeletonOpacity]);

    return (
        <Animated.View
            style={[
                {
                    width,
                    height,
                    backgroundColor: '#E1E9EE',
                    borderRadius: 4,
                    opacity: skeletonOpacity,
                },
                style,
            ]}
        />
    );
};

const HeaderSkeleton = () => (
    <View style={styles.headerBox}>
        <SkeletonBox width="60%" height={22} style={{ marginBottom: 4 }} />
        <SkeletonBox width="80%" height={14} style={{ marginBottom: 16 }} />
        <View style={styles.iconRow}>
            <SkeletonBox width="45%" height={44} style={{ borderRadius: 10, marginHorizontal: 10 }} />
            <SkeletonBox width="45%" height={44} style={{ borderRadius: 10, marginHorizontal: 10 }} />
        </View>
        <View style={styles.segmentedControl}>
            <SkeletonBox width="30%" height={36} style={{ borderRadius: 12, marginHorizontal: 2 }} />
            <SkeletonBox width="30%" height={36} style={{ borderRadius: 12, marginHorizontal: 2 }} />
            <SkeletonBox width="30%" height={36} style={{ borderRadius: 12, marginHorizontal: 2 }} />
        </View>
    </View>
);

const PeriodSelectorSkeleton = () => (
    <View style={{ width: '95%', alignSelf: 'center', marginTop: 14, marginBottom: 8, backgroundColor: '#fff', borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 10, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 }}>
        <SkeletonBox width={22} height={22} style={{ borderRadius: 11 }} />
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
            <SkeletonBox width={18} height={18} style={{ borderRadius: 9, marginHorizontal: 6 }} />
            <SkeletonBox width={100} height={17} style={{ marginHorizontal: 6 }} />
        </View>
        <SkeletonBox width={22} height={22} style={{ borderRadius: 11 }} />
        <SkeletonBox width={80} height={32} style={{ borderRadius: 20, marginLeft: 12 }} />
    </View>
);

const SummaryCardsSkeleton = () => (
    <View style={styles.cardsContainer}>
        <View style={{ flexDirection: 'row', width: '100%', gap: 12 }}>
            <View style={[styles.card, styles.incomeCard, { flex: 1, marginRight: 6 }]}>
                <View style={styles.cardRow}>
                    <View>
                        <SkeletonBox width={80} height={13} style={{ marginBottom: 2 }} />
                        <SkeletonBox width={100} height={20} />
                    </View>
                </View>
            </View>
            <View style={[styles.card, styles.expenseCard, { flex: 1, marginLeft: 6 }]}>
                <View style={styles.cardRow}>
                    <View>
                        <SkeletonBox width={80} height={13} style={{ marginBottom: 2 }} />
                        <SkeletonBox width={100} height={20} />
                    </View>
                </View>
            </View>
        </View>
        <View style={[styles.card, styles.savingsCard, { marginTop: 12 }]}>
            <View style={styles.cardRow}>
                <View>
                    <SkeletonBox width={80} height={13} style={{ marginBottom: 2 }} />
                    <SkeletonBox width={100} height={20} />
                </View>
            </View>
        </View>
    </View>
);

const ChartTabsSkeleton = () => (
    <View style={styles.segmentedControl2}>
        <SkeletonBox width="30%" height={36} style={{ borderRadius: 12, marginHorizontal: 2 }} />
        <SkeletonBox width="30%" height={36} style={{ borderRadius: 12, marginHorizontal: 2 }} />
        <SkeletonBox width="30%" height={36} style={{ borderRadius: 12, marginHorizontal: 2 }} />
    </View>
);

const ChartSkeleton = () => (
    <View style={styles.cardGraph}>
        <SkeletonBox width="60%" height={17} style={{ marginBottom: 2, alignSelf: 'flex-start' }} />
        <SkeletonBox width="80%" height={13} style={{ marginBottom: 10, alignSelf: 'flex-start' }} />
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', width: '100%', minHeight: 160, marginTop: 10 }}>
            <View style={{ justifyContent: 'space-between', height: 120, marginRight: 10, alignItems: 'flex-end' }}>
                {[1, 2, 3, 4, 5].map(i => (
                    <SkeletonBox key={i} width={40} height={11} />
                ))}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 120, flex: 1, justifyContent: 'space-between', paddingHorizontal: 10 }}>
                {[1, 2, 3, 4, 5].map(i => (
                    <View key={i} style={{ alignItems: 'center', justifyContent: 'flex-end', height: 130, width: 36 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', width: '100%', height: 120 }}>
                            <SkeletonBox width={12} height={60} style={{ borderRadius: 4, marginRight: 2 }} />
                            <SkeletonBox width={12} height={40} style={{ borderRadius: 4, marginLeft: 2 }} />
                        </View>
                        <SkeletonBox width={20} height={12} style={{ marginTop: 4 }} />
                    </View>
                ))}
            </View>
        </View>
    </View>
);

function getStartOfWeek(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
}
function getStartOfMonth(date) {
    const d = new Date(date);
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
}
function getStartOfYear(date) {
    const d = new Date(date);
    d.setMonth(0, 1);
    d.setHours(0, 0, 0, 0);
    return d;
}

function getISOWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function getNiceMax(val) {
    if (val <= 10) return 10;
    if (val <= 50) return Math.ceil(val / 10) * 10;
    if (val <= 100) return Math.ceil(val / 20) * 20;
    if (val <= 500) return Math.ceil(val / 50) * 50;
    if (val <= 1000) return Math.ceil(val / 100) * 100;
    const pow = Math.pow(10, Math.floor(Math.log10(val)));
    const n = Math.ceil(val / pow);
    if (n <= 2) return 2 * pow;
    if (n <= 5) return 5 * pow;
    return 10 * pow;
}

// Pie/donut arc helpers
function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
    var angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
        x: centerX + radius * Math.cos(angleInRadians),
        y: centerY + radius * Math.sin(angleInRadians)
    };
}
function describeArc(x, y, radius, startAngle, endAngle) {
    var start = polarToCartesian(x, y, radius, endAngle);
    var end = polarToCartesian(x, y, radius, startAngle);
    var largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
    var d = [
        'M', start.x, start.y,
        'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y
    ].join(' ');
    return d;
}

const Stats = () => {
    const navigation = useNavigation();
    const [selected, setSelected] = React.useState('Week');
    const [selectedChart, setSelectedChart] = React.useState('Trends');
    const [loading, setLoading] = React.useState(true);
    const [refreshing, setRefreshing] = React.useState(false);
    const [income, setIncome] = React.useState(0);
    const [expenses, setExpenses] = React.useState(0);
    const [net, setNet] = React.useState(0);
    const [barData, setBarData] = React.useState({ income: [], expenses: [], labels: [] });
    const [pieData, setPieData] = React.useState([]); // [{category, amount, color, percent}]
    const [selectedCategory, setSelectedCategory] = React.useState(null); // for Piechart interactivity
    const [selectedDayIdx, setSelectedDayIdx] = React.useState(null); // for Category chart tooltip
    const [selectedBarDay, setSelectedBarDay] = React.useState(null); // for Bar chart day selection
    const [chartWidth, setChartWidth] = React.useState(0); // dynamic width for chart
    const revealAnim = React.useRef(new Animated.Value(0)).current; // for Overview animation
    const revealAnimCategory = React.useRef(new Animated.Value(0)).current; // for Category animation
    const categorySweepAnim = React.useRef(new Animated.Value(0)).current; // for Category doughnut sweep
    const [categorySweep, setCategorySweep] = React.useState(0); // sweep progress for Category doughnut
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    // Fixed color palette for categories
    const pieColors = [
        '#4285f4', '#34a853', '#fbbc05', '#a142f4', '#ea4335', '#888', '#b0b0b0', '#1ecb7b', '#ff4d4f', '#1976d2'
    ];
    const barAnim = React.useRef(new Animated.Value(0)).current; // for Bar chart animation
    const chartTabs = ['Trends', 'Breakdown', 'Summary'];
    // Add state for period selector
    const [weekIndex, setWeekIndex] = React.useState(() => {
        // Use the same getISOWeekNumber function for consistency
        const now = new Date();
        return getISOWeekNumber(now);
    });
    const [monthIndex, setMonthIndex] = React.useState(() => (new Date()).getMonth());
    const [yearIndex, setYearIndex] = React.useState(0); // 0 = 2025, 1 = 2026, ...
    const baseYear = 2025;

    // Helper: get week number in month for a given weekIndex, monthIndex, and year
    function getWeekNumberInMonth(weekIdx, monthIdx, year) {
        // Find the first day of the month
        const firstOfMonth = new Date(year, monthIdx, 1);
        // Find the week number of the first day of the month (relative to year)
        const start = new Date(year, 0, 1);
        const daysToFirst = Math.floor((firstOfMonth - start) / (24 * 60 * 60 * 1000));
        const firstWeekOfMonth = Math.ceil((daysToFirst + start.getDay() + 1) / 7) - 1;
        // Week number in month is (weekIdx - firstWeekOfMonth + 1)
        return weekIdx - firstWeekOfMonth + 1;
    }
    // Helper: get total weeks in month
    function getTotalWeeksInMonth(monthIdx, year) {
        const firstOfMonth = new Date(year, monthIdx, 1);
        const lastOfMonth = new Date(year, monthIdx + 1, 0);
        const start = new Date(year, 0, 1);
        const daysToFirst = Math.floor((firstOfMonth - start) / (24 * 60 * 60 * 1000));
        const firstWeekOfMonth = Math.ceil((daysToFirst + start.getDay() + 1) / 7) - 1;
        const daysToLast = Math.floor((lastOfMonth - start) / (24 * 60 * 60 * 1000));
        const lastWeekOfMonth = Math.ceil((daysToLast + start.getDay() + 1) / 7) - 1;
        return lastWeekOfMonth - firstWeekOfMonth + 1;
    }

    function getPeriodLabel() {
        if (selected === 'Week') {
            // Calculate the date range for the selected week
            const now = new Date();
            const currentYear = now.getFullYear();
            const currentWeek = getISOWeekNumber(now);

            // console.log('📅 Date calculation debug:', {
            //     now: now.toISOString(),
            //     currentYear,
            //     weekIndex,
            //     currentWeek,
            //     selected
            // });

            // Calculate the target week date
            const weeksDiff = weekIndex - currentWeek;
            const targetDate = new Date(now);
            targetDate.setDate(now.getDate() + (weeksDiff * 7));

            // console.log('📅 Target calculation:', {
            //     weeksDiff,
            //     targetDate: targetDate.toISOString()
            // });

            // Find Monday of the target week
            const dayOfWeek = targetDate.getDay();
            const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
            const monday = new Date(targetDate);
            monday.setDate(targetDate.getDate() + mondayOffset);

            // Calculate Sunday of that week
            const sunday = new Date(monday);
            sunday.setDate(monday.getDate() + 6);

            // console.log('📅 Final dates:', {
            //     monday: monday.toISOString(),
            //     sunday: sunday.toISOString()
            // });

            // Format the date range
            const formatDate = (date) => {
                const month = date.toLocaleDateString('en-US', { month: 'short' });
                const day = date.getDate();
                return `${month} ${day}`;
            };

            const startFormatted = formatDate(monday);
            const endFormatted = formatDate(sunday);

            const result = `${startFormatted} to ${endFormatted}`;
            //console.log('📅 Final label:', result);

            return result;
        } else if (selected === 'Month') {
            return monthNames[monthIndex];
        } else {
            return (baseYear + yearIndex).toString();
        }
    }
    // Helper for 5-periods array
    function getPeriodArray() {
        if (selected === 'Week') {
            // Weeks 1-53, center current
            let arr = [];
            for (let i = -2; i <= 2; i++) arr.push(weekIndex + i + 1);
            return arr;
        } else if (selected === 'Month') {
            let arr = [];
            for (let i = -2; i <= 2; i++) {
                let idx = monthIndex + i;
                if (idx < 0) idx = 0;
                if (idx > 11) idx = 11;
                arr.push(monthNames[idx]);
            }
            return arr;
        } else {
            let arr = [];
            for (let i = -2; i <= 2; i++) arr.push(baseYear + yearIndex + i);
            return arr;
        }
    }

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = await AsyncStorage.getItem('token');
            const userData = await AsyncStorage.getItem('userData');
            let userId = null;
            if (userData) {
                try {
                    const user = JSON.parse(userData);
                    userId = user._id || user.id;
                } catch { }
            }
            const res = await axios.get(
                `${API_BASE_URL}/api/v1/personal/get-all-transactions`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const allTransactions = res.data.transactions || [];

            // Apply the same filtering logic as FiltersView - remove group transactions where user didn't pay
            let transactions = allTransactions;
            if (userId) {
                transactions = allTransactions.filter(t => !t.isGroupTransaction || (t.paidBy && String(t.paidBy) === String(userId)));
            }



            // Filter by selected period
            const now = new Date();
            let labels = [];
            let incomeArr = [];
            let expensesArr = [];
            let filterYear = now.getFullYear();
            if (selected === 'Year') {
                filterYear = baseYear + yearIndex;
            }
            if (selected === 'Week') {
                labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                incomeArr = Array(7).fill(0);
                expensesArr = Array(7).fill(0);
            } else if (selected === 'Month') {
                // Show 5 months with selected month in the center
                let start = Math.max(0, monthIndex - 2);
                let end = Math.min(11, monthIndex + 2);
                if (end - start < 4) {
                    if (start === 0) end = Math.min(4, 11);
                    else if (end === 11) start = Math.max(7, 0);
                }
                labels = monthNames.slice(start, end + 1);
                incomeArr = Array(labels.length).fill(0);
                expensesArr = Array(labels.length).fill(0);
            } else {
                // Years: 5 years with selected year in the center
                let start = baseYear + yearIndex - 2;
                let end = baseYear + yearIndex + 2;
                labels = Array.from({ length: 5 }, (_, i) => (start + i).toString());
                incomeArr = Array(5).fill(0);
                expensesArr = Array(5).fill(0);
            }
            let totalIncome = 0;
            let totalExpenses = 0;
            let chartIncomeArr = [];
            let chartExpensesArr = [];


            // Counters for tracking transactions
            let weekTransactionsCount = 0;
            let monthTransactionsCount = 0;
            let yearTransactionsCount = 0;
            let userPaidTransactionsCount = 0;
            let userReceivedTransactionsCount = 0;
            let allUserTransactionsCount = 0;

            transactions.forEach((t, index) => {
                // Use the same date calculation logic as FiltersView
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

                const weekNum = t.dateDetails ? t.dateDetails.week : getISOWeekNumber(transactionDate);
                const nowWeekNum = weekIndex; // weekIndex is already the correct week number
                const month = transactionDate.getMonth(); // 0-based
                const year = transactionDate.getFullYear();

                // WEEK
                if (selected === 'Week' && weekNum === nowWeekNum && year === now.getFullYear()) {
                    weekTransactionsCount++;
                    // Use the same day calculation logic as FiltersView
                    // For week view, we need to match FiltersView's date range approach
                    // FiltersView uses a 7-day range, so we need to calculate the start date
                    // Based on the logs, FiltersView uses "2025-09-06" to "2025-09-12"
                    // So we need to find the start date that matches this pattern

                    // Calculate the actual date range for the selected week (same as FiltersView)
                    const now = new Date();
                    const currentYear = now.getFullYear();
                    const currentWeek = getISOWeekNumber(now);
                    const weeksDiff = weekIndex - currentWeek;
                    const targetDate = new Date(now);
                    targetDate.setDate(now.getDate() + (weeksDiff * 7));

                    // Find Monday of the target week
                    const dayOfWeek = targetDate.getDay();
                    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
                    const monday = new Date(targetDate);
                    monday.setDate(targetDate.getDate() + mondayOffset);
                    monday.setHours(0, 0, 0, 0);

                    // Calculate day difference from Monday of the week
                    const dayDiff = Math.floor((transactionDate - monday) / (1000 * 60 * 60 * 24));
                    const dayIdx = Math.max(0, Math.min(6, dayDiff)); // Clamp to 0-6 range





                    // Use simple calculation like FiltersView - just sum by transactionType
                    if (t.transactionType === 'expense') {
                        totalExpenses += t.amount;
                        expensesArr[dayIdx] += t.amount;
                    } else if (t.transactionType === 'income') {
                        totalIncome += t.amount;
                        incomeArr[dayIdx] += t.amount;
                    }

                    // Keep the counting for debugging
                    if (t.isContactTransaction && t.contact) {
                        if (String(t.user?._id || t.user) === String(userId)) {
                            userPaidTransactionsCount++;
                        } else if (t.contact.user && String(t.contact.user) === String(userId)) {
                            userReceivedTransactionsCount++;
                        }
                    } else if (!t.isContactTransaction) {
                        if (String(t.user?._id || t.user) === String(userId)) {
                            allUserTransactionsCount++;
                        }
                    }
                }
            });



            // MONTH - Separate logic for summary cards (selected month only) and chart data (5 months)
            transactions.forEach(t => {
                // Use the same date calculation logic as FiltersView
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
                const month = transactionDate.getMonth();
                const year = transactionDate.getFullYear();

                if (selected === 'Month' && year === filterYear) {
                    monthTransactionsCount++;
                    // For summary cards: only selected month
                    if (month === monthIndex) {
                        // Use simple calculation like FiltersView - just sum by transactionType
                        if (t.transactionType === 'expense') {
                            totalExpenses += t.amount;
                        } else if (t.transactionType === 'income') {
                            totalIncome += t.amount;
                        }
                    }

                    // For chart data: 5 months range
                    let start = Math.max(0, monthIndex - 2);
                    let end = Math.min(11, monthIndex + 2);
                    if (end - start < 4) {
                        if (start === 0) end = Math.min(4, 11);
                        else if (end === 11) start = Math.max(7, 0);
                    }
                    if (month >= start && month <= end) {
                        const idx = month - start;
                        // Use simple calculation like FiltersView - just sum by transactionType
                        if (t.transactionType === 'expense') {
                            expensesArr[idx] += t.amount;
                        } else if (t.transactionType === 'income') {
                            incomeArr[idx] += t.amount;
                        }
                    }
                }
            });

            // YEAR (5 years, selected in center)
            transactions.forEach(t => {
                // Use the same date calculation logic as FiltersView
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
                const year = transactionDate.getFullYear();

                if (selected === 'Year') {
                    yearTransactionsCount++;
                    // For summary cards: only selected year
                    if (year === (baseYear + yearIndex)) {
                        // Use simple calculation like FiltersView - just sum by transactionType
                        if (t.transactionType === 'expense') {
                            totalExpenses += t.amount;
                        } else if (t.transactionType === 'income') {
                            totalIncome += t.amount;
                        }
                    }

                    // For chart data: 5 years range
                    let start = baseYear + yearIndex - 2;
                    let end = baseYear + yearIndex + 2;
                    if (year >= start && year <= end) {
                        const idx = year - start;
                        // Use simple calculation like FiltersView - just sum by transactionType
                        if (t.transactionType === 'expense') {
                            expensesArr[idx] += t.amount;
                        } else if (t.transactionType === 'income') {
                            incomeArr[idx] += t.amount;
                        }
                    }
                }
            });


            // Calculate totals using the same simple logic as FiltersView
            const simpleIncome = transactions
                .filter(t => t.transactionType === 'income')
                .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

            const simpleExpenses = transactions
                .filter(t => t.transactionType === 'expense')
                .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);


            // Use the simple calculation to match FiltersView
            setIncome(simpleIncome);
            setExpenses(simpleExpenses);
            setNet(simpleIncome - simpleExpenses);
            setBarData({ income: incomeArr, expenses: expensesArr, labels });

            // Debug: date range label and per-label amounts
            try {
                // const periodLabel = getPeriodLabel();
                // console.log('[Stats] Period label:', periodLabel);
                // console.log('[Stats] Bar labels:', labels);
                // console.log('[Stats] Income per label:', incomeArr);
                // console.log('[Stats] Expenses per label:', expensesArr);
            } catch (err) {
                // no-op
            }


            // Debug log for final bar data
            // console.log('📊 Final bar data:', {
            //     incomeArr,
            //     expensesArr,
            //     labels,
            //     totalIncome,
            //     totalExpenses
            // });
            // --- PIECHART DATA LOGIC ---
            // 1. Filter transactions for selected period, only expenses
            let filtered = [];

            if (selected === 'Week') {
                const nowWeekNum = weekIndex;
                filtered = transactions.filter(t => {
                    const tDate = t.dateDetails ? new Date(t.dateDetails.date + 'T00:00:00') : new Date(t.createdAt);
                    const weekNum = t.dateDetails ? t.dateDetails.week : getISOWeekNumber(tDate);
                    const year = tDate.getFullYear();
                    if (weekNum !== nowWeekNum || year !== now.getFullYear()) return false;
                    // Use simple calculation like FiltersView - just filter by transactionType
                    return t.transactionType === 'expense';
                });
            } else if (selected === 'Month') {
                // For pie chart: only selected month (not 5 months range)
                filtered = transactions.filter(t => {
                    const tDate = t.dateDetails ? new Date(t.dateDetails.date + 'T00:00:00') : new Date(t.createdAt);
                    const month = tDate.getMonth();
                    const year = tDate.getFullYear();
                    if (year !== filterYear || month !== monthIndex) return false;
                    // Use simple calculation like FiltersView - just filter by transactionType
                    return t.transactionType === 'expense';
                });
            } else if (selected === 'Year') {
                // For pie chart: only selected year (not 5 years range)
                filtered = transactions.filter(t => {
                    const tDate = t.dateDetails ? new Date(t.dateDetails.date + 'T00:00:00') : new Date(t.createdAt);
                    const year = tDate.getFullYear();
                    if (year !== (baseYear + yearIndex)) return false;
                    // Use simple calculation like FiltersView - just filter by transactionType
                    return t.transactionType === 'expense';
                });
            }
            // 2. Aggregate by category
            const categoryTotals = {};
            let total = 0;
            filtered.forEach(t => {
                const cat = t.category || 'Other';
                categoryTotals[cat] = (categoryTotals[cat] || 0) + t.amount;
                total += t.amount;
            });

            // 3. Prepare pieData array
            const cats = Object.keys(categoryTotals);
            const pieArr = cats.map((cat, i) => ({
                category: cat,
                amount: categoryTotals[cat],
                color: pieColors[i % pieColors.length],
                percent: total > 0 ? (categoryTotals[cat] / total) * 100 : 0
            }));

            setPieData(pieArr);
        } catch (e) {
            setIncome(0);
            setExpenses(0);
            setNet(0);
            setBarData({ income: [], expenses: [], labels: [] });
            setPieData([]);
        }
        setLoading(false);
    };

    React.useEffect(() => {
        fetchData();
    }, [selected, weekIndex, monthIndex, yearIndex]);

    // Animate Overview chart reveal when barData changes or tab is selected
    React.useEffect(() => {
        if (selectedChart === 'Summary' && chartWidth > 0) {
            revealAnim.setValue(0);
            Animated.timing(revealAnim, {
                toValue: 1,
                duration: 1200,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: false,
            }).start();
        }
    }, [selectedChart, barData, chartWidth]);

    // Animate Category chart reveal when barData changes or tab is selected
    React.useEffect(() => {
        if (selectedChart === 'Breakdown' && chartWidth > 0) {
            revealAnimCategory.setValue(0);
            Animated.timing(revealAnimCategory, {
                toValue: 1,
                duration: 1200,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: false,
            }).start();
        }
    }, [selectedChart, barData, chartWidth]);

    // Animate Category doughnut sweep when selectedChart or pieData changes
    React.useEffect(() => {
        if (selectedChart === 'Breakdown') {
            categorySweepAnim.setValue(0);
            const id = categorySweepAnim.addListener(({ value }) => {
                setCategorySweep(value);
            });
            Animated.timing(categorySweepAnim, {
                toValue: 1,
                duration: 1200,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: false,
            }).start(() => {
                categorySweepAnim.removeListener(id);
            });
            return () => categorySweepAnim.removeListener(id);
        }
    }, [selectedChart, pieData]);

    // Animate Bar chart bars when selectedChart or barData changes
    React.useEffect(() => {
        if (selectedChart === 'Trends') {
            barAnim.setValue(0);
            Animated.timing(barAnim, {
                toValue: 1,
                duration: 900,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: false,
            }).start();
        }
    }, [selectedChart, barData]);

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchData();
        setRefreshing(false);
    };

    const handleBarClick = (dayIndex) => {
        if (selectedBarDay === dayIndex) {
            setSelectedBarDay(null); // Deselect if same bar clicked
        } else {
            setSelectedBarDay(dayIndex);

            // Console log bar data on press
            const dayIncome = barData.income[dayIndex] || 0;
            const dayExpense = barData.expenses[dayIndex] || 0;
            const dayNet = dayIncome - dayExpense;
            const dayLabel = barData.labels[dayIndex] || 'Unknown';

            // console.log('[Stats] Bar press:', {
            //     index: dayIndex,
            //     label: dayLabel,
            //     income: dayIncome,
            //     expense: dayExpense,
            //     net: dayNet,
            //     period: getPeriodLabel(),
            // });

        }
    };

    const getDayFinancialData = (dayIndex) => {
        if (dayIndex === null || !barData.income || !barData.expenses) return null;

        const dayIncome = barData.income[dayIndex] || 0;
        const dayExpense = barData.expenses[dayIndex] || 0;
        const dayNet = dayIncome - dayExpense;

        const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        const dayName = dayNames[dayIndex];

        // Calculate the actual date for the selected day
        let targetDate;
        if (selected === 'Week') {
            // Calculate the date for the selected week and day
            const now = new Date();
            const currentYear = now.getFullYear();
            const currentWeek = getISOWeekNumber(now);
            const weeksDiff = weekIndex - currentWeek;
            const tempDate = new Date(now);
            tempDate.setDate(now.getDate() + (weeksDiff * 7));

            // Find Monday of the target week
            const dayOfWeek = tempDate.getDay();
            const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
            const monday = new Date(tempDate);
            monday.setDate(tempDate.getDate() + mondayOffset);

            // Calculate the specific day
            const specificDay = new Date(monday);
            specificDay.setDate(monday.getDate() + dayIndex);

            targetDate = specificDay;

            // Debug logs for date calculation
            // console.log('🔍 getDayFinancialData Debug:', {
            //     dayIndex,
            //     dayName,
            //     weekIndex,
            //     currentWeek,
            //     weeksDiff,
            //     now: now.toISOString(),
            //     tempDate: tempDate.toISOString(),
            //     monday: monday.toISOString(),
            //     specificDay: specificDay.toISOString(),
            //     targetDate: targetDate.toISOString()
            // });
        } else if (selected === 'Month') {
            // For month view, we need to calculate the date within the selected month
            const now = new Date();
            const filterYear = now.getFullYear();
            const firstOfMonth = new Date(filterYear, monthIndex, 1);
            const dayOfWeek = firstOfMonth.getDay();
            const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
            const firstMonday = new Date(firstOfMonth);
            firstMonday.setDate(firstOfMonth.getDate() + mondayOffset);

            const specificDay = new Date(firstMonday);
            specificDay.setDate(firstMonday.getDate() + dayIndex);

            targetDate = specificDay;
        } else {
            // For year view, use current date as fallback
            targetDate = new Date();
        }

        const formattedDate = targetDate.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        // console.log('📅 Final date result:', {
        //     dayIndex,
        //     dayName,
        //     targetDate: targetDate.toISOString(),
        //     formattedDate
        // });

        return {
            dayName,
            date: formattedDate,
            income: dayIncome,
            expense: dayExpense,
            net: dayNet
        };
    };

    function handleReset() {
        const now = new Date();
        // Week - use the same getISOWeekNumber function
        setWeekIndex(getISOWeekNumber(now));
        // Month
        setMonthIndex(now.getMonth());
        // Year
        setYearIndex(now.getFullYear() - baseYear);
    }

    // Animated values for count-up effect
    const incomeAnim = React.useRef(new Animated.Value(0)).current;
    const expensesAnim = React.useRef(new Animated.Value(0)).current;
    const netAnim = React.useRef(new Animated.Value(0)).current;
    const [displayIncome, setDisplayIncome] = React.useState(0);
    const [displayExpenses, setDisplayExpenses] = React.useState(0);
    const [displayNet, setDisplayNet] = React.useState(0);

    // Animate income
    React.useEffect(() => {
        Animated.timing(incomeAnim, {
            toValue: income,
            duration: 800,
            useNativeDriver: false,
        }).start();
    }, [income]);
    React.useEffect(() => {
        const id = incomeAnim.addListener(({ value }) => setDisplayIncome(value));
        return () => incomeAnim.removeListener(id);
    }, []);
    // Animate expenses
    React.useEffect(() => {
        Animated.timing(expensesAnim, {
            toValue: expenses,
            duration: 800,
            useNativeDriver: false,
        }).start();
    }, [expenses]);
    React.useEffect(() => {
        const id = expensesAnim.addListener(({ value }) => setDisplayExpenses(value));
        return () => expensesAnim.removeListener(id);
    }, []);
    // Animate net
    React.useEffect(() => {
        Animated.timing(netAnim, {
            toValue: net,
            duration: 800,
            useNativeDriver: false,
        }).start();
    }, [net]);
    React.useEffect(() => {
        const id = netAnim.addListener(({ value }) => setDisplayNet(value));
        return () => netAnim.removeListener(id);
    }, []);

    return (
        <ScrollView
            refreshControl={
                <RefreshControl
                    refreshing={refreshing}
                    onRefresh={handleRefresh}
                    colors={['#8b5cf6']}
                />
            }
        >
            <View style={styles.container}>
                {loading ? (
                    <HeaderSkeleton />
                ) : (
                    <View style={styles.headerBox}>
                        <Text style={styles.headerTitle}>Financial Analytics</Text>
                        <Text style={styles.headerSubtitle}>Your spending insights & trends</Text>
                        <View style={styles.iconRow}>
                            <TouchableOpacity
                                style={styles.iconButton}
                                onPress={() => navigation.navigate('FiltersView')}
                            >
                                <Ionicons name="filter-outline" size={24} color="#8b5cf6" />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.iconButton}
                                onPress={() => navigation.navigate('TransExport')}
                            >
                                <Ionicons name="download-outline" size={24} color="#8b5cf6" />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.segmentedControl}>
                            {['Week', 'Month', 'Year'].map((item) => (
                                <TouchableOpacity
                                    key={item}
                                    style={[
                                        styles.segmentButton,
                                        selected === item && styles.segmentButtonActive
                                    ]}
                                    onPress={() => setSelected(item)}
                                >
                                    <Text style={selected === item ? styles.segmentTextActive : styles.segmentText}>
                                        {item}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                )}
                {loading ? (
                    <PeriodSelectorSkeleton />
                ) : (
                    <View style={{ width: '95%', alignSelf: 'center', marginTop: 14, marginBottom: 8, backgroundColor: '#fff', borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 10, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 }}>
                        {/* Left arrow */}
                        <TouchableOpacity
                            onPress={() => {
                                if (selected === 'Week' && weekIndex > 1) setWeekIndex(weekIndex - 1);
                                if (selected === 'Month' && monthIndex > 0) setMonthIndex(monthIndex - 1);
                                if (selected === 'Year' && yearIndex > -2) setYearIndex(yearIndex - 1);
                            }}
                            style={{ padding: 8 }}
                        >
                            <Ionicons name="chevron-back" size={22} color="#222" />
                        </TouchableOpacity>
                        {/* Centered label with calendar icon */}
                        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                            <Ionicons name="calendar-outline" size={18} color="#888" style={{ marginHorizontal: 6 }} />
                            <Text style={{ fontSize: 17, fontWeight: 'bold', color: '#222', minWidth: 70, textAlign: 'center' }}>{getPeriodLabel()}</Text>
                        </View>
                        {/* Right arrow */}
                        <TouchableOpacity
                            onPress={() => {
                                if (selected === 'Week' && weekIndex < 53) setWeekIndex(weekIndex + 1);
                                if (selected === 'Month' && monthIndex < 11) setMonthIndex(monthIndex + 1);
                                if (selected === 'Year' && yearIndex < 2) setYearIndex(yearIndex + 1);
                            }}
                            style={{ padding: 8 }}
                        >
                            <Ionicons name="chevron-forward" size={22} color="#222" />
                        </TouchableOpacity>
                        {/* Reset button at far right */}
                        <TouchableOpacity
                            onPress={handleReset}
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                backgroundColor: '#f5f6fa',
                                borderRadius: 20,
                                paddingVertical: 6,
                                paddingHorizontal: 14,
                                marginLeft: 12,
                                shadowColor: '#8b5cf6',
                                shadowOpacity: 0.08,
                                shadowRadius: 4,
                                elevation: 1,
                            }}
                        >
                            <Ionicons name="refresh" size={18} color="#8b5cf6" style={{ marginRight: 6 }} />
                            <Text style={{ color: '#8b5cf6', fontWeight: 'bold', fontSize: 15 }}>Reset</Text>
                        </TouchableOpacity>
                    </View>
                )}
                {loading ? (
                    <SummaryCardsSkeleton />
                ) : (
                    <View style={styles.cardsContainer}>
                        <View style={{ flexDirection: 'row', width: '100%', gap: 12 }}>
                            {/* Total Income Card */}
                            <View style={[styles.card, styles.incomeCard, { flex: 1, marginRight: 6 }]}>
                                <View style={styles.cardRow}>
                                    <View>
                                        <Text style={styles.cardTitle}>Total Income</Text>
                                        <Animated.Text style={styles.cardValueIncome}>₹{displayIncome.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</Animated.Text>
                                    </View>
                                </View>
                            </View>
                            {/* Total Expenses Card */}
                            <View style={[styles.card, styles.expenseCard, { flex: 1, marginLeft: 6 }]}>
                                <View style={styles.cardRow}>
                                    <View>
                                        <Text style={styles.cardTitle}>Total Expenses</Text>
                                        <Animated.Text style={styles.cardValueExpense}>₹{displayExpenses.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</Animated.Text>
                                    </View>
                                </View>
                            </View>
                        </View>
                        {/* Net Savings Card */}
                        <View style={[styles.card, styles.savingsCard, { marginTop: 12 }]}>
                            <View style={styles.cardRow}>
                                <View>
                                    <Text style={styles.cardTitle}>Net Savings</Text>
                                    <Animated.Text style={styles.cardValueSavings}>₹{displayNet.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</Animated.Text>
                                </View>
                            </View>
                        </View>
                    </View>
                )}
                {/* New segmented control for Bar, Piechart, Category, Overview */}
                {loading ? (
                    <ChartTabsSkeleton />
                ) : (
                    <View style={styles.segmentedControl2}>
                        {chartTabs.map((item) => (
                            <TouchableOpacity
                                key={item}
                                style={[
                                    styles.segmentButton2,
                                    selectedChart === item && styles.segmentButtonActive2
                                ]}
                                onPress={() => setSelectedChart(item)}
                            >
                                <Text style={selectedChart === item ? styles.segmentTextActive2 : styles.segmentText2}>
                                    {item}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
                {/* Dummy Graphs Section */}
                <View style={styles.graphContainer}>
                    {loading ? (
                        <ChartSkeleton />
                    ) : selectedChart === 'Trends' && (
                        <View style={styles.cardGraph}>
                            <Text style={styles.graphTitle}>Trends Over Time</Text>
                            <Text style={styles.graphSubtitle}>Track your income and expenses by period</Text>
                            <View style={styles.barChartOuterRow}>
                                <View style={styles.barChartAxisLabelsCol}>
                                    {/* Dynamically generate y-axis labels based on nice max value */}
                                    {(() => {
                                        const allVals = [...barData.income, ...barData.expenses];
                                        const max = Math.max(1, ...allVals);
                                        const niceMax = getNiceMax(max);
                                        const step = niceMax / 4; // Use exact division for proper alignment
                                        return [4, 3, 2, 1, 0].map(i => (
                                            <Text key={i} style={styles.axisLabel}>₹{(step * i).toLocaleString()}</Text>
                                        ));
                                    })()}
                                </View>
                                <View style={styles.barChartRowsAligned}>
                                    {(() => {
                                        // Calculate niceMax once for all bars to ensure consistency
                                        const allVals = [...barData.income, ...barData.expenses];
                                        const max = Math.max(1, ...allVals);
                                        const niceMax = getNiceMax(max);

                                        // Use the same height as the Y-axis container (160px)
                                        const chartHeight = 160;

                                        // Calculate the actual available height for bars (accounting for padding)
                                        const availableHeight = chartHeight - 18; // Subtract paddingBottom

                                        return barData.labels.map((label, i) => {
                                            const isSelected = selectedBarDay === i;
                                            return (
                                                <View key={i} style={styles.barGroupAligned}>
                                                    <TouchableOpacity
                                                        activeOpacity={0.7}
                                                        onPress={() => handleBarClick(i)}
                                                        style={styles.barPairAligned}
                                                    >
                                                        <Animated.View style={[
                                                            styles.barAligned,
                                                            {
                                                                height: barAnim.interpolate({
                                                                    inputRange: [0, 1],
                                                                    outputRange: [0, (barData.income[i] / niceMax) * availableHeight]
                                                                }),
                                                                backgroundColor: '#1ecb7b',
                                                                marginRight: 2,
                                                                borderWidth: isSelected ? 2 : 0,
                                                                borderColor: '#333'
                                                            }
                                                        ]} />
                                                        <Animated.View style={[
                                                            styles.barAligned,
                                                            {
                                                                height: barAnim.interpolate({
                                                                    inputRange: [0, 1],
                                                                    outputRange: [0, (barData.expenses[i] / niceMax) * availableHeight]
                                                                }),
                                                                backgroundColor: '#ff4d4f',
                                                                marginLeft: 2,
                                                                borderWidth: isSelected ? 2 : 0,
                                                                borderColor: '#333'
                                                            }
                                                        ]} />
                                                    </TouchableOpacity>
                                                    <Text style={styles.barMonthAligned}>{label}</Text>
                                                </View>
                                            );
                                        });
                                    })()}
                                </View>
                            </View>
                            {/* Day Details Card - Show when a bar is selected */}
                            {selectedBarDay !== null && (() => {
                                const dayData = getDayFinancialData(selectedBarDay);
                                if (!dayData) return null;
                                return (
                                    <View style={styles.dayDetailsCard}>
                                        <Text style={styles.dayDetailsTitle}>{dayData.dayName} Details</Text>
                                        <Text style={styles.dayDetailsDate}>{dayData.date}</Text>
                                        <View style={styles.dayDetailsRow}>
                                            <View style={styles.dayDetailItem}>
                                                <Text style={styles.dayDetailLabel}>Income</Text>
                                                <Text style={styles.dayDetailValueIncome}>₹{dayData.income.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</Text>
                                            </View>
                                            <View style={styles.dayDetailItem}>
                                                <Text style={styles.dayDetailLabel}>Expenses</Text>
                                                <Text style={styles.dayDetailValueExpense}>₹{dayData.expense.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</Text>
                                            </View>
                                            <View style={styles.dayDetailItem}>
                                                <Text style={styles.dayDetailLabel}>Net</Text>
                                                <Text style={[
                                                    styles.dayDetailValueNet,
                                                    { color: dayData.net >= 0 ? '#2e7d32' : '#c62828' }
                                                ]}>₹{dayData.net.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</Text>
                                            </View>
                                        </View>
                                    </View>
                                );
                            })()}
                        </View>
                    )}
                    {!loading && selectedChart === 'Breakdown' && (
                        <View style={styles.cardGraph}>
                            <Text style={styles.graphTitle}>Spending Breakdown</Text>
                            <Text style={styles.graphSubtitle}>See where your money goes by category</Text>
                            {(() => {
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
                                            {/* Custom Donut Chart - Big Circle */}
                                            <View style={{ width: 220, height: 220, justifyContent: 'center', alignItems: 'center', position: 'relative', marginBottom: 20 }}>
                                                {(() => {
                                                    let startAngle = 0;
                                                    const gap = 4; // Gap between segments
                                                    return pieData.map((item, i) => {
                                                        const angle = (item.percent / 100) * 360 - gap;
                                                        if (angle <= 0) return null;

                                                        const endAngle = startAngle + angle;
                                                        const isSelected = selectedCategory === null || selectedCategory === item.category;

                                                        // Calculate SVG path for the segment
                                                        const radius = 70;
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
                                                                onPress={() => setSelectedCategory(item.category === selectedCategory ? null : item.category)}
                                                                style={{ position: 'absolute', width: 220, height: 220, justifyContent: 'center', alignItems: 'center' }}
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

                                                {/* Center hole */}
                                                <View style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: '#fff', position: 'absolute', top: 60, left: 60, zIndex: 2, justifyContent: 'center', alignItems: 'center' }} />

                                                {/* Center label for selected category */}
                                                {selectedCategory && (() => {
                                                    const sel = pieData.find(p => p.category === selectedCategory);
                                                    if (!sel) return null;
                                                    return (
                                                        <View style={{ position: 'absolute', top: 85, left: 0, right: 0, alignItems: 'center', zIndex: 3 }}>
                                                            <Text style={{ fontSize: 16, fontWeight: 'bold', color: sel.color }}>{sel.category}</Text>
                                                            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#222' }}>₹{sel.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</Text>
                                                            <Text style={{ fontSize: 14, color: '#888', fontWeight: '500' }}>{sel.percent.toFixed(1)}%</Text>
                                                        </View>
                                                    );
                                                })()}
                                            </View>

                                            {/* Legend Below - Labels */}
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
                                                            onPress={() => setSelectedCategory(selectedCategory === item.category ? null : item.category)}
                                                            style={{
                                                                flexDirection: 'row',
                                                                alignItems: 'center',
                                                                marginRight: 8,
                                                                marginBottom: 8,
                                                                opacity: selectedCategory === null || selectedCategory === item.category ? 1 : 0.4,
                                                                paddingVertical: 6,
                                                                paddingHorizontal: 10,
                                                                borderRadius: 8,
                                                                backgroundColor: selectedCategory === item.category ? '#f8f9fa' : 'transparent',
                                                                borderWidth: 1,
                                                                borderColor: selectedCategory === item.category ? item.color : 'transparent',
                                                                shadowColor: selectedCategory === item.category ? item.color : 'transparent',
                                                                shadowOffset: { width: 0, height: 1 },
                                                                shadowOpacity: selectedCategory === item.category ? 0.15 : 0,
                                                                shadowRadius: 2,
                                                                elevation: selectedCategory === item.category ? 2 : 0,
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
                                                            <Text style={{ fontSize: 12, color: '#222', fontWeight: '600' }}>{item.category}</Text>
                                                        </TouchableOpacity>
                                                    ))}
                                                </View>
                                            </View>
                                        </View>

                                        {/* Show details card on category tap */}
                                        {selectedCategory && (() => {
                                            const sel = pieData.find(p => p.category === selectedCategory);
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
                                                    <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#6C63FF', marginBottom: 6, textAlign: 'center' }}>{sel.category}</Text>
                                                    <Text style={{ fontSize: 18, color: sel.color, fontWeight: 'bold', textAlign: 'center' }}>₹{sel.amount.toLocaleString()}</Text>
                                                    <Text style={{ fontSize: 14, color: '#666', marginTop: 4, textAlign: 'center' }}>{sel.percent.toFixed(1)}% of total expenses</Text>
                                                </View>
                                            );
                                        })()}
                                    </View>
                                );
                            })()}
                        </View>
                    )}
                    {!loading && selectedChart === 'Summary' && (
                        <View style={styles.cardGraph}>
                            <Text style={styles.graphTitle}>Financial Summary</Text>
                            <Text style={styles.graphSubtitle}>Overview of your financial flow</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'flex-end', width: '100%', minHeight: 180, marginTop: 10, marginBottom: 0 }}>
                                {/* Y-axis labels */}
                                <View style={{ justifyContent: 'space-between', height: 140, marginRight: 10, alignItems: 'flex-end', paddingBottom: 18 }}>
                                    {(() => {
                                        const vals = [...barData.income, ...barData.expenses];
                                        const max = Math.max(1, ...vals);
                                        const niceMax = getNiceMax(max);
                                        const step = niceMax / 4; // Use exact division for proper alignment
                                        return [4, 3, 2, 1, 0].map(i => (
                                            <Text key={i} style={styles.axisLabel}>₹{(step * i).toLocaleString()}</Text>
                                        ));
                                    })()}
                                </View>
                                {/* Chart SVG - dynamic width */}
                                <View
                                    style={{ flex: 1, height: 140, marginLeft: 0, marginTop: 0, position: 'relative', backgroundColor: 'transparent', borderRadius: 12, overflow: 'visible' }}
                                    onLayout={e => {
                                        const w = e.nativeEvent.layout.width;
                                        if (w && w !== chartWidth) setChartWidth(w);
                                    }}
                                >
                                    {chartWidth > 0 && (() => {
                                        const incomeVals = barData.income || [];
                                        const expenseVals = barData.expenses || [];
                                        const max = Math.max(1, ...incomeVals, ...expenseVals);
                                        const niceMax = getNiceMax(max);
                                        const n = incomeVals.length;
                                        // No sidePad for Overview: points go from 0 to chartWidth
                                        const xStep = n > 1 ? chartWidth / (n - 1) : 0;
                                        const incomePoints = incomeVals.map((v, i) => ({
                                            x: i * xStep,
                                            y: 140 - (v / niceMax) * 120
                                        }));
                                        const expensePoints = expenseVals.map((v, i) => ({
                                            x: i * xStep,
                                            y: 140 - (v / niceMax) * 120
                                        }));
                                        // Smooth cubic Bezier spline for line and area
                                        function getCubicBezierPath(points) {
                                            if (points.length < 2) return '';
                                            let d = `M${points[0].x},${points[0].y}`;
                                            for (let i = 0; i < points.length - 1; i++) {
                                                const p0 = points[i];
                                                const p1 = points[i + 1];
                                                const pPrev = points[i - 1] || p0;
                                                const pNext = points[i + 2] || p1;
                                                const cp1x = p0.x + (p1.x - pPrev.x) / 6;
                                                const cp1y = p0.y + (p1.y - pPrev.y) / 6;
                                                const cp2x = p1.x - (pNext.x - p0.x) / 6;
                                                const cp2y = p1.y - (pNext.y - p0.y) / 6;
                                                d += ` C${cp1x},${cp1y} ${cp2x},${cp2y} ${p1.x},${p1.y}`;
                                            }
                                            return d;
                                        }
                                        function getCubicAreaPath(points, chartHeight, chartWidth) {
                                            if (points.length < 2) return '';
                                            let d = `M0,${chartHeight} L${points[0].x},${points[0].y}`;
                                            for (let i = 0; i < points.length - 1; i++) {
                                                const p0 = points[i];
                                                const p1 = points[i + 1];
                                                const pPrev = points[i - 1] || p0;
                                                const pNext = points[i + 2] || p1;
                                                const cp1x = p0.x + (p1.x - pPrev.x) / 6;
                                                const cp1y = p0.y + (p1.y - pPrev.y) / 6;
                                                const cp2x = p1.x - (pNext.x - p0.x) / 6;
                                                const cp2y = p1.y - (pNext.y - p0.y) / 6;
                                                d += ` C${cp1x},${cp1y} ${cp2x},${cp2y} ${p1.x},${p1.y}`;
                                            }
                                            d += ` L${chartWidth},${chartHeight} Z`;
                                            return d;
                                        }
                                        const incomeArea = getCubicAreaPath(incomePoints, 140, chartWidth);
                                        const expenseArea = getCubicAreaPath(expensePoints, 140, chartWidth);
                                        const incomeLine = getCubicBezierPath(incomePoints);
                                        const expenseLine = getCubicBezierPath(expensePoints);
                                        return (
                                            <Svg width={chartWidth} height={140}>
                                                {/* Grid lines */}
                                                {Array.from({ length: 5 }, (_, i) => (
                                                    <Path key={i} d={`M0,${35 * i} H${chartWidth}`} stroke="#e5e7eb" strokeWidth={0.8} opacity={0.5} />
                                                ))}
                                                {/* Expenses area (red, below) */}
                                                <Path d={expenseArea} fill="#ff4d4f" opacity={0.18} />
                                                {/* Income area (blue, above) */}
                                                <Path d={incomeArea} fill="#3b82f6" opacity={0.18} />
                                                {/* Expenses line */}
                                                <Path d={expenseLine} stroke="#ff4d4f" strokeWidth={2} fill="none" />
                                                {/* Income line */}
                                                <Path d={incomeLine} stroke="#3b82f6" strokeWidth={2} fill="none" />
                                                {/* Animated reveal mask (right to left) */}
                                                <AnimatedRect
                                                    x={Animated.multiply(revealAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }), chartWidth)}
                                                    y={0}
                                                    width={revealAnim.interpolate({ inputRange: [0, 1], outputRange: [chartWidth, 0] })}
                                                    height={140}
                                                    fill="#fff"
                                                    pointerEvents="none"
                                                />
                                            </Svg>
                                        );
                                    })()}
                                </View>
                            </View>
                            {/* X-axis labels - dynamic width */}
                            <View style={{ width: chartWidth, height: 20, position: 'relative', marginLeft: 0, marginTop: 8 }}>
                                {(barData.labels || ['Jan', 'Feb', 'Mar', 'Apr', 'May']).map((d, i, arr) => {
                                    const n = arr.length;
                                    // No sidePad for Overview
                                    const xStep = n > 1 ? chartWidth / (n - 1) : 0;
                                    const x = i * xStep;
                                    return (
                                        <Text
                                            key={i}
                                            style={{
                                                position: 'absolute',
                                                left: x - 20,
                                                width: 40,
                                                textAlign: 'center',
                                                fontSize: 13,
                                                color: '#888',
                                                fontWeight: '500',
                                            }}
                                            numberOfLines={1}
                                        >
                                            {d}
                                        </Text>
                                    );
                                })}
                            </View>
                        </View>
                    )}
                </View>
            </View>
        </ScrollView>
    )
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f0f0f0',
        paddingTop: 30,
        alignItems: 'center',
    },
    headerBox: {
        backgroundColor: '#fff',
        borderRadius: 10,
        marginTop: 20,
        padding: 20,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#8b5cf6',
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#888',
        marginBottom: 16,
    },
    iconRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        marginBottom: 16,
    },
    iconButton: {
        flex: 1,
        backgroundColor: '#f5f6fa',
        borderRadius: 10,
        width: '100%',
        alignItems: 'center',
        padding: 10,
        marginHorizontal: 10,
    },
    segmentedControl: {
        flexDirection: 'row',
        backgroundColor: '#f5f6fa',
        borderRadius: 16,
        padding: 4,
        width: '100%',
        justifyContent: 'space-between',
    },
    segmentButton: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 8,
        borderRadius: 12,
        marginHorizontal: 2,
    },
    segmentButtonActive: {
        backgroundColor: 'linear-gradient(90deg, #6C63FF 0%, #48C6EF 100%)',
        backgroundColor: '#8b5cf6', // fallback for RN
        shadowColor: '#8b5cf6',
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    segmentText: {
        color: '#8b5cf6',
        fontWeight: '500',
    },
    segmentTextActive: {
        color: '#fff',
        fontWeight: 'bold',
    },
    cardsContainer: {
        width: '95%',
        marginTop: 20,
        gap: 16,
    },
    card: {
        borderRadius: 16,
        padding: 12,
        marginBottom: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 2,
    },
    incomeCard: {
        backgroundColor: '#eaffea',
    },
    expenseCard: {
        backgroundColor: '#ffeaea',
    },
    savingsCard: {
        backgroundColor: '#eaf0ff',
    },
    cardRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    cardTitle: {
        fontSize: 13,
        color: '#444',
        marginBottom: 2,
        fontWeight: '600',
    },
    cardValueIncome: {
        fontSize: 20,
        color: '#2e7d32',
        fontWeight: 'bold',
    },
    cardValueExpense: {
        fontSize: 20,
        color: '#c62828',
        fontWeight: 'bold',
    },
    cardValueSavings: {
        fontSize: 20,
        color: '#1976d2',
        fontWeight: 'bold',
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 16,
        paddingVertical: 2,
        paddingHorizontal: 7,
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 2,
        elevation: 1,
    },
    badgeRed: {
        backgroundColor: '#fff0f0',
    },
    badgeGreen: {
        backgroundColor: '#eaffea',
    },
    badgeBlue: {
        backgroundColor: '#eaf0ff',
    },
    badgeTextRed: {
        color: '#e57373',
        fontWeight: 'bold',
        fontSize: 12,
    },
    badgeTextGreen: {
        color: '#43a047',
        fontWeight: 'bold',
        fontSize: 12,
    },
    badgeTextBlue: {
        color: '#1976d2',
        fontWeight: 'bold',
        fontSize: 12,
    },
    segmentedControl2: {
        flexDirection: 'row',
        backgroundColor: '#f5f6fa',
        borderRadius: 16,
        padding: 4,
        width: '95%',
        alignSelf: 'center',
        justifyContent: 'space-between',
        marginTop: 18,
        marginBottom: 8,
    },
    segmentButton2: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 8,
        borderRadius: 12,
        marginHorizontal: 2,
    },
    segmentButtonActive2: {
        backgroundColor: '#8b5cf6',
        shadowColor: '#8b5cf6',
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    segmentText2: {
        color: '#8b5cf6',
        fontWeight: '500',
    },
    segmentTextActive2: {
        color: '#fff',
        fontWeight: 'bold',
    },
    graphContainer: {
        width: '95%',
        alignSelf: 'center',
        marginTop: 8,
        marginBottom: 20,
        minHeight: 130,
    },
    cardGraph: {
        backgroundColor: '#fff',
        borderRadius: 18,
        padding: 18,
        marginBottom: 8,
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
        alignItems: 'center',
    },
    graphTitle: {
        fontSize: 17,
        fontWeight: 'bold',
        color: '#222',
        marginBottom: 2,
        textAlign: 'left',
        alignSelf: 'flex-start',
    },
    graphSubtitle: {
        fontSize: 13,
        color: '#888',
        alignSelf: 'flex-start',
        marginBottom: 8,
    },
    // Bar chart styles
    barChartOuterRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        width: '100%',
        minHeight: 180,
        marginTop: 8,
        marginBottom: 0,
    },
    barChartAxisLabelsCol: {
        justifyContent: 'space-between',
        height: 180,
        marginRight: 10,
        alignItems: 'flex-end',
        paddingBottom: 18,
    },
    barChartRowsAligned: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        height: 180,
        flex: 1,
        justifyContent: 'space-between',
        paddingRight: 10,
        paddingLeft: 10,
        backgroundColor: 'transparent',
    },
    barGroupAligned: {
        alignItems: 'center',
        justifyContent: 'flex-end',
        height: 180,
        width: 36,
        marginHorizontal: 2,
    },
    barPairAligned: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'center',
        width: '100%',
        height: 120,
    },
    barAligned: {
        width: 12,
        borderRadius: 4,
        marginBottom: 2,
    },
    barMonthAligned: {
        fontSize: 12,
        color: '#888',
        marginTop: 4,
        textAlign: 'center',
    },
    barLegendRowAligned: {
        flexDirection: 'row',
        marginTop: 16,
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
    },
    axisLabel: {
        fontSize: 11,
        color: '#888',
    },
    // Pie chart styles
    pieRowImproved: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
        marginTop: 10,
        justifyContent: 'center',
    },
    donutChartContainerImproved: {
        width: 120,
        height: 120,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    donutSegment: {
        position: 'absolute',
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 20,
        borderColor: '#4285f4',
        borderRightColor: 'transparent',
        borderBottomColor: 'transparent',
    },
    donutChartHoleImproved: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#fff',
        position: 'absolute',
        top: 32,
        left: 32,
        zIndex: 3,
    },
    pieLegendImproved: {
        marginLeft: 28,
        justifyContent: 'center',
    },
    legendItemImproved: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    legendDotImproved: {
        width: 16,
        height: 16,
        borderRadius: 4,
        marginRight: 8,
    },
    legendTextImproved: {
        fontSize: 14,
        color: '#222',
    },
    // Line chart styles
    lineChartOuterRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        width: '100%',
        minHeight: 160,
        marginTop: 10,
        marginBottom: 0,
    },
    lineChartAxisLabelsCol: {
        justifyContent: 'space-between',
        height: 120,
        marginRight: 10,
        alignItems: 'flex-end',
        paddingBottom: 18,
    },
    lineChartAreaImproved: {
        width: 280,
        height: 120,
        marginLeft: 0,
        marginTop: 0,
        position: 'relative',
        backgroundColor: 'transparent',
        borderRadius: 12,
        overflow: 'hidden',
    },
    lineChartGridLine: {
        position: 'absolute',
        left: 0,
        width: '100%',
        height: 1,
        backgroundColor: '#e5e7eb',
        opacity: 0.7,
        zIndex: 0,
    },
    lineAreaFillImproved: {
        position: 'absolute',
        left: 0,
        bottom: 0,
        width: 280,
        height: 100,
        backgroundColor: '#eaf0ff',
        opacity: 0.7,
        borderBottomLeftRadius: 12,
        borderBottomRightRadius: 12,
        zIndex: 1,
    },
    linePathImproved: {
        position: 'absolute',
        left: 0,
        bottom: 0,
        width: 280,
        height: 120,
        borderLeftWidth: 2,
        borderColor: 'transparent',
        borderBottomWidth: 2,
        borderBottomColor: '#6C63FF',
        borderRadius: 10,
        zIndex: 2,
    },
    lineDotImproved: {
        position: 'absolute',
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#fff',
        borderWidth: 2,
        borderColor: '#6C63FF',
        zIndex: 3,
    },
    lineChartLabelsRowImproved: {
        flexDirection: 'row',
        marginLeft: 50,
        marginTop: 8,
        width: 280,
        justifyContent: 'space-between',
    },
    lineChartLabelImproved: {
        fontSize: 12,
        color: '#888',
    },
    // Area chart styles
    areaChartOuterRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        width: '100%',
        minHeight: 180,
        marginTop: 10,
        marginBottom: 0,
    },
    areaChartAxisLabelsCol: {
        justifyContent: 'space-between',
        height: 140,
        marginRight: 10,
        alignItems: 'flex-end',
        paddingBottom: 18,
    },
    areaChartAreaImproved: {
        width: 280,
        height: 140,
        marginLeft: 0,
        marginTop: 0,
        position: 'relative',
        backgroundColor: 'transparent',
        borderRadius: 12,
        overflow: 'hidden',
    },
    areaExpensesImproved: {
        position: 'absolute',
        left: 0,
        bottom: 0,
        width: 280,
        height: 90,
        backgroundColor: '#ffeaea',
        opacity: 0.8,
        borderBottomLeftRadius: 12,
        borderBottomRightRadius: 12,
        zIndex: 1,
    },
    areaExpensesLine: {
        position: 'absolute',
        left: 0,
        width: 280,
        height: 2,
        backgroundColor: '#e57373',
        top: 48,
        zIndex: 2,
    },
    areaIncomeImproved: {
        position: 'absolute',
        left: 0,
        bottom: 0,
        width: 280,
        height: 120,
        backgroundColor: '#eaf0ff',
        opacity: 0.8,
        borderBottomLeftRadius: 12,
        borderBottomRightRadius: 12,
        zIndex: 3,
    },
    areaIncomeLine: {
        position: 'absolute',
        left: 0,
        width: 280,
        height: 2,
        backgroundColor: '#8b5cf6',
        top: 20,
        zIndex: 4,
    },
    areaChartLabelsRowImproved: {
        flexDirection: 'row',
        marginLeft: 50,
        marginTop: 8,
        width: 280,
        justifyContent: 'space-between',
    },
    areaChartLabelImproved: {
        fontSize: 12,
        color: '#888',
    },
    // New style for lineConnector
    lineConnector: {
        position: 'absolute',
        height: 2,
        backgroundColor: '#8b5cf6',
        zIndex: 2,
        borderRadius: 2,
    },
    dayDetailsCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 12,
        marginTop: 10,
        width: '100%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 2,
    },
    dayDetailsTitle: {
        fontSize: 17,
        fontWeight: 'bold',
        color: '#222',
        marginBottom: 4,
    },
    dayDetailsDate: {
        fontSize: 14,
        color: '#666',
        marginBottom: 12,
        fontWeight: '500',
    },
    dayDetailsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    dayDetailItem: {
        flex: 1,
        alignItems: 'center',
        paddingHorizontal: 8,
    },
    dayDetailLabel: {
        fontSize: 12,
        color: '#666',
        marginBottom: 4,
        fontWeight: '500',
        textAlign: 'center',
    },
    dayDetailValueIncome: {
        fontSize: 16,
        color: '#2e7d32',
        fontWeight: 'bold',
        textAlign: 'center',
    },
    dayDetailValueExpense: {
        fontSize: 16,
        color: '#c62828',
        fontWeight: 'bold',
        textAlign: 'center',
    },
    dayDetailValueNet: {
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'center',
    },
})

export default Stats; 
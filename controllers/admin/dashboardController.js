const { Order } = require('../../models/orderSchema');
const User = require('../../models/userSchema');
const Product = require('../../models/productSchema');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const moment = require('moment');

const dateUtils = {
    getDateRange: (reportType, startDate, endDate) => {
        const ranges = {
            daily: {
                start: moment().startOf('day'),
                end: moment().endOf('day')
            },
            weekly: {
                start: moment().subtract(6, 'days'),
                end: moment()
            },
            monthly: {
                start: moment().startOf('month'),
                end: moment().endOf('month')
            },
            yearly: {
                start: moment().startOf('year'),
                end: moment().endOf('year')
            },
            custom: {
                start: startDate ? moment(startDate, 'DD-MM-YYYY').startOf('day') : moment().subtract(6, 'days'),
                end: endDate ? moment(endDate, 'DD-MM-YYYY').endOf('day') : moment()
            }
        };

        return ranges[reportType] || ranges.weekly;
    },
    getPreviousPeriod: (dateRange) => {
        const duration = moment.duration(dateRange.end.diff(dateRange.start));
        const days = duration.asDays();
        
        return {
            start: moment(dateRange.start).subtract(days, 'days'),
            end: moment(dateRange.end).subtract(days, 'days')
        };
    }
};

const dashboardService = {
    async getQuickStats(dateRange) {
        const [orderStats, totalUsers, productStats, cancelledOrderStats] = await Promise.all([
            Order.aggregate([
                {
                    $match: {
                        createdOn: {
                            $gte: dateRange.start.toDate(),
                            $lte: dateRange.end.toDate()
                        }
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalOrders: { $sum: 1 },
                        totalRevenue: { $sum: '$finalAmount' },
                        totalDiscount: { $sum: '$discount' },
                        avgOrderValue: { $avg: '$finalAmount' }
                    }
                }
            ]),
            User.countDocuments(),
            Product.aggregate([
                {
                    $group: {
                        _id: null,
                        totalProducts: { $sum: 1 },
                        lowStock: {
                            $sum: { $cond: [{ $lt: ['$stock', 10] }, 1, 0] }
                        }
                    }
                }
            ]),
            Order.aggregate([
                {
                    $match: {
                        status: 'Cancelled',
                        createdOn: {
                            $gte: dateRange.start.toDate(),
                            $lte: dateRange.end.toDate()
                        }
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalCancelledOrders: { $sum: 1 },
                        totalCancelledAmount: { $sum: '$finalAmount' }
                    }
                }
            ])
        ]);

        const stats = orderStats[0] || {
            totalOrders: 0,
            totalRevenue: 0,
            totalDiscount: 0,
            avgOrderValue: 0
        };

        const cancelledStats = cancelledOrderStats[0] || {
            totalCancelledOrders: 0,
            totalCancelledAmount: 0
        };

        // Calculate completed orders (total - cancelled)
        const totalCompletedOrders = stats.totalOrders - cancelledStats.totalCancelledOrders;

        return {
            totalOrders: stats.totalOrders,
            totalRevenue: stats.totalRevenue,
            totalDiscount: stats.totalDiscount,
            avgOrderValue: stats.avgOrderValue,
            totalUsers,
            totalProducts: productStats[0]?.totalProducts || 0,
            lowStockProducts: productStats[0]?.lowStock || 0,
            totalCancelledOrders: cancelledStats.totalCancelledOrders,
            totalCancelledAmount: cancelledStats.totalCancelledAmount,
            totalCompletedOrders
        };
    },

    // Fixed payment method stats with date range
    async getPaymentMethodStats(dateRange) {
        const stats = await Order.aggregate([
            {
                $match: {
                    createdOn: {
                        $gte: dateRange.start.toDate(),
                        $lte: dateRange.end.toDate()
                    },
                    // Optionally exclude cancelled orders if needed
                    // status: { $ne: 'Cancelled' }
                }
            },
            {
                $group: {
                    _id: '$paymentMethod',
                    totalAmount: { $sum: '$finalAmount' },
                    totalOrders: { $sum: 1 },
                    completedOrders: {
                        $sum: {
                            $cond: [
                                { $ne: ['$status', 'Cancelled'] },
                                1,
                                0
                            ]
                        }
                    },
                    completedAmount: {
                        $sum: {
                            $cond: [
                                { $ne: ['$status', 'Cancelled'] },
                                '$finalAmount',
                                0
                            ]
                        }
                    }
                }
            },
            {
                $project: {
                    paymentMethod: '$_id',
                    totalAmount: 1,
                    totalOrders: 1,
                    completedOrders: 1,
                    completedAmount: 1,
                    cancelledOrders: { $subtract: ['$totalOrders', '$completedOrders'] },
                    cancelledAmount: { $subtract: ['$totalAmount', '$completedAmount'] }
                }
            },
            { $sort: { completedAmount: -1 } }
        ]);

        return stats;
    },
  

    async getPeriodComparison(currentRange, previousRange) {
        const [currentStats, previousStats] = await Promise.all([
            Order.aggregate([
                {
                    $match: {
                        createdOn: {
                            $gte: currentRange.start.toDate(),
                            $lte: currentRange.end.toDate()
                        }
                    }
                },
                {
                    $group: {
                        _id: null,
                        revenue: { $sum: '$finalAmount' },
                        orders: { $sum: 1 }
                    }
                }
            ]),
            Order.aggregate([
                {
                    $match: {
                        createdOn: {
                            $gte: previousRange.start.toDate(),
                            $lte: previousRange.end.toDate()
                        }
                    }
                },
                {
                    $group: {
                        _id: null,
                        revenue: { $sum: '$finalAmount' },
                        orders: { $sum: 1 }
                    }
                }
            ])
        ]);

        const current = currentStats[0] || { revenue: 0, orders: 0 };
        const previous = previousStats[0] || { revenue: 0, orders: 0 };

        return {
            revenueGrowth: previous.revenue ? ((current.revenue - previous.revenue) / previous.revenue) * 100 : 0,
            orderGrowth: previous.orders ? ((current.orders - previous.orders) / previous.orders) * 100 : 0
        };
    },

    async getSalesAnalytics(dateRange) {
        return Order.aggregate([
            {
                $match: {
                    createdOn: {
                        $gte: dateRange.start.toDate(),
                        $lte: dateRange.end.toDate()
                    }
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: '%Y-%m-%d', date: '$createdOn' }
                    },
                    totalRevenue: { $sum: '$finalAmount' },
                    totalOrders: { $sum: 1 },
                    totalDiscount: { $sum: '$discount' },
                    avgOrderValue: { $avg: '$finalAmount' }
                }
            },
            { $sort: { '_id': 1 } }
        ]);
    },

    async getTopProducts(dateRange) {
        return Order.aggregate([
            {
                $match: {
                    createdOn: {
                        $gte: dateRange.start.toDate(),
                        $lte: dateRange.end.toDate()
                    }
                }
            },
            { $unwind: '$orderedItems' },
            {
                $group: {
                    _id: '$orderedItems.product',
                    totalQuantity: { $sum: '$orderedItems.quantity' },
                    totalRevenue: { $sum: { $multiply: ['$orderedItems.price', '$orderedItems.quantity'] } }
                }
            },
            { $sort: { totalRevenue: -1 } },
            { $limit: 5 },
            {
                $lookup: {
                    from: 'products',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'productInfo'
                }
            },
            { $unwind: '$productInfo' }
        ]);
    },

    async getRecentOrders(dateRange) {
        return Order.find({
            createdOn: {
                $gte: dateRange.start.toDate(),
                $lte: dateRange.end.toDate()
            }
        })
        .sort({ createdOn: -1 })
        .limit(10)
        .populate('user', 'name email')
        .lean();
    },

    async generateReport(dateRange, format) {
        const [salesData, topProducts] = await Promise.all([
            this.getSalesAnalytics(dateRange),
            this.getTopProducts(dateRange)
        ]);
        
        if (format === 'excel') {
            return this.generateExcelReport(dateRange, salesData, topProducts);
        } else {
            return this.generatePDFReport(dateRange, salesData, topProducts);
        }
    },

    async generateExcelReport(dateRange, salesData, topProducts) {
        const workbook = new ExcelJS.Workbook();
        
        // Sales Overview Sheet
        const salesSheet = workbook.addWorksheet('Sales Overview');
        salesSheet.columns = [
            { header: 'Date', key: 'date', width: 15 },
            { header: 'Orders', key: 'orders', width: 10 },
            { header: 'Revenue', key: 'revenue', width: 15 },
            { header: 'Discount', key: 'discount', width: 15 },
            { header: 'Avg Order Value', key: 'avgOrder', width: 15 },
            // New columns
            { header: 'Cancelled Orders', key: 'cancelledOrders', width: 15 },
            { header: 'Cancelled Amount', key: 'cancelledAmount', width: 15 }
        ];
        
        // Fetch cancelled order details for the date range
        const cancelledOrders = await Order.aggregate([
            {
                $match: {
                    status: 'Cancelled',
                    createdOn: {
                        $gte: dateRange.start.toDate(),
                        $lte: dateRange.end.toDate()
                    }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdOn' } },
                    cancelledOrdersCount: { $sum: 1 },
                    cancelledAmount: { $sum: '$finalAmount' }
                }
            }
        ]);
    
        // Create a map of cancelled orders for easy lookup
        const cancelledOrderMap = new Map(
            cancelledOrders.map(item => [item._id, item])
        );
    
        salesData.forEach(data => {
            const cancelledData = cancelledOrderMap.get(data._id) || { 
                cancelledOrdersCount: 0, 
                cancelledAmount: 0 
            };
    
            salesSheet.addRow({
                date: moment(data._id).format('DD-MM-YYYY'),
                orders: data.totalOrders,
                revenue: data.totalRevenue,
                discount: data.totalDiscount,
                avgOrder: data.avgOrderValue,
                cancelledOrders: cancelledData.cancelledOrdersCount,
                cancelledAmount: cancelledData.cancelledAmount
            });
        });
        
        // Top Products Sheet
        const productsSheet = workbook.addWorksheet('Top Products');
        productsSheet.columns = [
            { header: 'Product', key: 'product', width: 30 },
            { header: 'Quantity', key: 'quantity', width: 15 },
            { header: 'Revenue', key: 'revenue', width: 15 },
            // New columns
            { header: 'Category', key: 'category', width: 15 },
            { header: 'Current Stock', key: 'stock', width: 15 }
        ];
        
        topProducts.forEach(product => {
            productsSheet.addRow({
                product: product.productInfo.productName,
                quantity: product.totalQuantity,
                revenue: product.totalRevenue,
                category: product.productInfo.category,
                stock: product.productInfo.stock
            });
        });
        
        return workbook;
    },
    
    async generatePDFReport(dateRange, salesData) {
        // Validate input parameters
        if (!dateRange || !salesData ) {
            throw new Error('Invalid input: Missing required report data');
        }
    
        const doc = new PDFDocument();
        
        // Header
        doc.fontSize(20).text('Sales Report', { align: 'center' });
        doc.moveDown();
        
        // Date Range - Add null checks
        const startDate = dateRange.start ? dateRange.start.format('DD-MM-YYYY') : 'N/A'; 
        const endDate = dateRange.end ? dateRange.end.format('DD-MM-YYYY') : 'N/A'; 
        doc.fontSize(12).text(`Period: ${startDate} to ${endDate}`);
        doc.moveDown();
        
        // Fetch cancelled order details for the date range
        const cancelledOrders = await Order.aggregate([
            {
                $match: {
                    status: 'Cancelled',
                    createdOn: {
                        $gte: dateRange.start.toDate(),
                        $lte: dateRange.end.toDate()
                    }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdOn' } },
                    cancelledOrdersCount: { $sum: 1 },
                    cancelledAmount: { $sum: '$finalAmount' }
                }
            }
        ]);
    
        // Create a map of cancelled orders for easy lookup
        const cancelledOrderMap = new Map(
            cancelledOrders.map(item => [item._id, item])
        );
        
        // Sales Overview
        doc.fontSize(16).text('Sales Overview');
        doc.moveDown();
        
        let y = doc.y;
        const headers = ['Date', 'Orders', 'Revenue', 'Discount', 'Cancelled Orders', 'Cancelled Amount'];
        doc.fontSize(10);
        
        headers.forEach((header, i) => {
            doc.text(header, 50 + (i * 100), y);
        });
        
        // Safe data processing with fallback values
        salesData.forEach((data) => {
            // Provide default values to prevent undefined errors
            const safeData = {
                _id: data._id || 'N/A',
                totalOrders: data.totalOrders || 0,
                totalRevenue: data.totalRevenue || 0,
                totalDiscount: data.totalDiscount || 0
            };
        
            const cancelledData = cancelledOrderMap.get(safeData._id) || { 
                cancelledOrdersCount: 0, 
                cancelledAmount: 0 
            };
        
            y = doc.y + 20;
            doc.text(moment(safeData._id).format('DD-MM-YYYY'), 50, y); // Change the date format here
            doc.text(safeData.totalOrders.toString(), 150, y);
            doc.text(`${safeData.totalRevenue.toFixed(2)}`, 250, y);
            doc.text(`${safeData.totalDiscount.toFixed(2)}`, 350, y);
            doc.text(cancelledData.cancelledOrdersCount.toString(), 450, y);
            doc.text(`${cancelledData.cancelledAmount.toFixed(2)}`, 550, y);
        });
        
        return doc;
    }
};


    const adminDashboardController = {
        getDashboard: async (req, res, next) => {
            try {
                const { reportType = 'weekly', startDate, endDate } = req.query;
                const dateRange = dateUtils.getDateRange(reportType, startDate, endDate);
                const previousRange = dateUtils.getPreviousPeriod(dateRange);
    
                const [
                    quickStats,
                    periodComparison,
                    salesAnalytics,
                    topProducts,
                    recentOrders,
                    paymentMethodStats
                ] = await Promise.all([
                    dashboardService.getQuickStats(dateRange),
                    dashboardService.getPeriodComparison(dateRange, previousRange),
                    dashboardService.getSalesAnalytics(dateRange),
                    dashboardService.getTopProducts(dateRange),
                    dashboardService.getRecentOrders(dateRange),
                    dashboardService.getPaymentMethodStats(dateRange)
                ]);
                
                // Calculate totals for payment methods
                const paymentTotals = paymentMethodStats.reduce((acc, method) => ({
                    totalAmount: acc.totalAmount + method.totalAmount,
                    completedAmount: acc.completedAmount + method.completedAmount,
                    cancelledAmount: acc.cancelledAmount + method.cancelledAmount
                }), { totalAmount: 0, completedAmount: 0, cancelledAmount: 0 });
                
                res.render('dashboard', {
                    ...quickStats,
                    periodComparison,
                    salesAnalytics,
                    topProducts,
                    recentOrders,
                    paymentMethodStats,
                    paymentTotals,
                    reportType,
                    startDate: dateRange.start.format('DD-MM-YYYY'),
                    endDate: dateRange.end.format('DD-MM-YYYY'),
                    moment
                });
            } catch (error) {
                console.error('Dashboard Error:', error);
                next(error);
            }
        },

    getDashboardData: async (req, res, next) => {
        try {
            const { reportType = 'weekly', startDate, endDate } = req.query;
            const dateRange = dateUtils.getDateRange(reportType, startDate, endDate);
            const previousRange = dateUtils.getPreviousPeriod(dateRange);

            const [
                quickStats,
                periodComparison,
                salesAnalytics,
                topProducts,
                recentOrders,
                paymentMethodStats
            ] = await Promise.all([
                dashboardService.getQuickStats(dateRange),
                dashboardService.getPeriodComparison(dateRange, previousRange),
                dashboardService.getSalesAnalytics(dateRange),
                dashboardService.getTopProducts(dateRange),
                dashboardService.getRecentOrders(dateRange),
                dashboardService.getPaymentMethodStats(dateRange)
            ]);
            
            res.json({
                quickStats,
                periodComparison,
                salesAnalytics,
                topProducts,
                recentOrders,
                paymentMethodStats
            });
        } catch (error) {
            console.error('Dashboard Data Error:', error);
            next(error);
        }
    },

    downloadReport: async (req, res, next) => {
        try {
            const { reportType = 'weekly', startDate, endDate, format } = req.query;
            const dateRange = dateUtils.getDateRange(reportType, startDate, endDate);
            
            if (format === 'excel') {
                const workbook = await dashboardService.generateReport(dateRange, 'excel');
                res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                res.setHeader('Content-Disposition', 'attachment; filename=sales-report.xlsx');
                await workbook.xlsx.write(res);
            } else {
                const doc = await dashboardService.generateReport(dateRange, 'pdf');
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', 'attachment; filename=sales-report.pdf');
                doc.pipe(res);
                doc.end();
            }
        } catch (error) {
            console.error('Report Download Error:', error);
            next(error);
        }
    }
};

module.exports = adminDashboardController;
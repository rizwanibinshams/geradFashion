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
    // Quick statistics for dashboard overview
    async getQuickStats(dateRange) {
        const [orderStats, activeUsers, productStats, cancelledOrderStats, deliveredOrderStats] = await Promise.all([
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
            User.countDocuments({ isBlocked: { $ne: true } }),
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
            ]),
            Order.aggregate([
                {
                    $match: {
                        status: 'Delivered',
                        createdOn: {
                            $gte: dateRange.start.toDate(),
                            $lte: dateRange.end.toDate()
                        }
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalDeliveredOrders: { $sum: 1 },
                        totalDeliveredAmount: { $sum: '$finalAmount' }
                    }
                }
            ])
        ]);

        return {
            totalOrders: orderStats[0]?.totalOrders || 0,
            totalRevenue: orderStats[0]?.totalRevenue || 0,
            totalDiscount: orderStats[0]?.totalDiscount || 0,
            avgOrderValue: orderStats[0]?.avgOrderValue || 0,
            activeUsers,
            totalProducts: productStats[0]?.totalProducts || 0,
            lowStockProducts: productStats[0]?.lowStock || 0,
            totalCancelledOrders: cancelledOrderStats[0]?.totalCancelledOrders || 0,
            totalCancelledAmount: cancelledOrderStats[0]?.totalCancelledAmount || 0,
            totalCompletedOrders: deliveredOrderStats[0]?.totalDeliveredOrders || 0
        };
    },

    // Payment method statistics
    async getPaymentMethodStats(dateRange) {
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
                    _id: '$paymentMethod',
                    totalAmount: { $sum: '$finalAmount' },
                    totalOrders: { $sum: 1 },
                    completedOrders: {
                        $sum: {
                            $cond: [
                                { $eq: ['$status', 'Delivered'] },
                                1,
                                0
                            ]
                        }
                    },
                    completedAmount: {
                        $sum: {
                            $cond: [
                                { $eq: ['$status', 'Delivered'] },
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
                    cancelledOrders: { 
                        $subtract: ['$totalOrders', '$completedOrders']
                    },
                    cancelledAmount: { 
                        $subtract: ['$totalAmount', '$completedAmount'] 
                    }
                }
            },
            { $sort: { completedAmount: -1 } }
        ]);
    },

    // Compare current period with previous period
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

    // Daily sales analytics
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

    // Top 10 best-selling products
    async getTopProducts(dateRange) {
        return Order.aggregate([
            {
                $match: {
                    createdOn: {
                        $gte: dateRange.start.toDate(),
                        $lte: dateRange.end.toDate()
                    },
                    status: 'Delivered'
                }
            },
            { $unwind: '$orderedItems' },
            {
                $group: {
                    _id: '$orderedItems.product',
                    totalQuantity: { $sum: '$orderedItems.quantity' },
                    totalRevenue: { $sum: { $multiply: ['$orderedItems.price', '$orderedItems.quantity'] } },
                    totalOrders: { $sum: 1 }
                }
            },
            { $sort: { totalRevenue: -1 } },
            { $limit: 10 },
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

    // Top 10 best-selling categories
    async getTopCategories(dateRange) {
        return Order.aggregate([
            {
                $match: {
                    createdOn: {
                        $gte: dateRange.start.toDate(),
                        $lte: dateRange.end.toDate()
                    },
                    status: 'Delivered'
                }
            },
            { $unwind: '$orderedItems' },
            {
                $lookup: {
                    from: 'products',
                    localField: 'orderedItems.product',
                    foreignField: '_id',
                    as: 'productInfo'
                }
            },
            { $unwind: '$productInfo' },
            {
                $lookup: {
                    from: 'categories',  // Assuming your categories collection name
                    localField: 'productInfo.category',
                    foreignField: '_id',
                    as: 'categoryInfo'
                }
            },
            { $unwind: '$categoryInfo' },
            {
                $group: {
                    _id: {
                        id: '$productInfo.category',
                        name: '$categoryInfo.name'  // Include category name in grouping
                    },
                    totalQuantity: { $sum: '$orderedItems.quantity' },
                    totalRevenue: { $sum: { $multiply: ['$orderedItems.price', '$orderedItems.quantity'] } },
                    totalOrders: { $sum: 1 }
                }
            },
            { $sort: { totalRevenue: -1 } },
            { $limit: 10 },
            {
                $project: {
                    _id: '$_id.id',
                    categoryName: '$_id.name',
                    totalQuantity: 1,
                    totalRevenue: 1,
                    totalOrders: 1
                }
            }
        ]);
    },

    // Top 10 best-selling brands
    async getTopBrands(dateRange) {
        return Order.aggregate([
            {
                $match: {
                    createdOn: {
                        $gte: dateRange.start.toDate(),
                        $lte: dateRange.end.toDate()
                    },
                    status: 'Delivered'
                }
            },
            { $unwind: '$orderedItems' },
            {
                $lookup: {
                    from: 'products',
                    localField: 'orderedItems.product',
                    foreignField: '_id',
                    as: 'productInfo'
                }
            },
            { $unwind: '$productInfo' },
            {
                $group: {
                    _id: '$productInfo.brand',
                    totalQuantity: { $sum: '$orderedItems.quantity' },
                    totalRevenue: { $sum: { $multiply: ['$orderedItems.price', '$orderedItems.quantity'] } },
                    totalOrders: { $sum: 1 }
                }
            },
            { $sort: { totalRevenue: -1 } },
            { $limit: 10 }
        ]);
    },

    // Recent orders
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

    // Generate reports (Excel/PDF)
    async generateReport(dateRange, format) {
        const [salesData, topProducts] = await Promise.all([
            this.getSalesAnalytics(dateRange),
            this.getTopProducts(dateRange)
        ]);
        
        return format === 'excel' 
            ? this.generateExcelReport(dateRange, salesData, topProducts)
            : this.generatePDFReport(dateRange, salesData);
    },

    async generateExcelReport(dateRange, salesData, topProducts) {
        const workbook = new ExcelJS.Workbook();
        
        const salesSheet = workbook.addWorksheet('Sales Overview');
        salesSheet.columns = [
            { header: 'Date', key: 'date', width: 15 },
            { header: 'Total Orders', key: 'orders', width: 15 },
            { header: 'Completed Orders', key: 'deliveredOrders', width: 15 },
            { header: 'Revenue', key: 'revenue', width: 15 },
            { header: 'Discount', key: 'discount', width: 15 },
            { header: 'Avg Order Value', key: 'avgOrder', width: 15 },
            { header: 'Cancelled Orders', key: 'cancelledOrders', width: 15 },
            { header: 'Cancelled Amount', key: 'cancelledAmount', width: 15 }
        ];
        
        // Fetch both cancelled and delivered orders
        const [cancelledOrders, deliveredOrders] = await Promise.all([
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
                        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdOn' } },
                        cancelledOrdersCount: { $sum: 1 },
                        cancelledAmount: { $sum: '$finalAmount' }
                    }
                }
            ]),
            Order.aggregate([
                {
                    $match: {
                        status: 'Delivered',  // Only delivered orders count as completed
                        createdOn: {
                            $gte: dateRange.start.toDate(),
                            $lte: dateRange.end.toDate()
                        }
                    }
                },
                {
                    $group: {
                        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdOn' } },
                        deliveredOrdersCount: { $sum: 1 },
                        deliveredAmount: { $sum: '$finalAmount' }
                    }
                }
            ])
        ]);
    
        const cancelledOrderMap = new Map(
            cancelledOrders.map(item => [item._id, item])
        );
    
        const deliveredOrderMap = new Map(
            deliveredOrders.map(item => [item._id, item])
        );
    
        // Initialize totals
        let totalStats = {
            totalOrders: 0,
            totalDeliveredOrders: 0,
            totalRevenue: 0,
            totalDiscount: 0,
            totalCancelledOrders: 0,
            totalCancelledAmount: 0
        };
    
        salesData.forEach(data => {
            const cancelledData = cancelledOrderMap.get(data._id) || { 
                cancelledOrdersCount: 0, 
                cancelledAmount: 0 
            };
    
            const deliveredData = deliveredOrderMap.get(data._id) || {
                deliveredOrdersCount: 0,
                deliveredAmount: 0
            };
    
            const rowData = {
                date: moment(data._id).format('DD-MM-YYYY'),
                orders: data.totalOrders,
                deliveredOrders: deliveredData.deliveredOrdersCount,
                revenue: data.totalRevenue,
                discount: data.totalDiscount,
                avgOrder: data.avgOrderValue,
                cancelledOrders: cancelledData.cancelledOrdersCount,
                cancelledAmount: cancelledData.cancelledAmount
            };
    
            // Add row to sheet
            salesSheet.addRow(rowData);
    
            // Update totals
            totalStats.totalOrders += data.totalOrders;
            totalStats.totalDeliveredOrders += deliveredData.deliveredOrdersCount;
            totalStats.totalRevenue += data.totalRevenue;
            totalStats.totalDiscount += data.totalDiscount;
            totalStats.totalCancelledOrders += cancelledData.cancelledOrdersCount;
            totalStats.totalCancelledAmount += cancelledData.cancelledAmount;
        });
    
        // Add a blank row for spacing
        salesSheet.addRow({});
    
        // Add totals row with bold formatting
        const totalsRow = salesSheet.addRow({
            date: 'TOTAL',
            orders: totalStats.totalOrders,
            deliveredOrders: totalStats.totalDeliveredOrders,
            revenue: totalStats.totalRevenue,
            discount: totalStats.totalDiscount,
            avgOrder: totalStats.totalRevenue / totalStats.totalDeliveredOrders, // Calculate overall average
            cancelledOrders: totalStats.totalCancelledOrders,
            cancelledAmount: totalStats.totalCancelledAmount
        });
    
        // Style the totals row
        totalsRow.eachCell((cell) => {
            cell.font = { bold: true };
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFE0E0E0' }
            };
        });
    
        // Format numbers in the entire sheet
        salesSheet.eachRow((row, rowNumber) => {
            if (rowNumber > 1) { // Skip header row
                const cells = ['revenue', 'discount', 'avgOrder', 'cancelledAmount'];
                cells.forEach(key => {
                    const cell = row.getCell(salesSheet.getColumn(key).number);
                    cell.numFmt = '#,##0.00';
                });
            }
        });
        
        // Add top products sheet
        const productsSheet = workbook.addWorksheet('Top Products');
        productsSheet.columns = [
            { header: 'Product', key: 'product', width: 30 },
            { header: 'Quantity', key: 'quantity', width: 15 },
            { header: 'Revenue', key: 'revenue', width: 15 },
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
        if (!dateRange || !salesData) {
            throw new Error('Invalid input: Missing required report data');
        }

        const doc = new PDFDocument();
        
        // Website Details Header
        doc.fontSize(24).text('Sales Report', { align: 'center' });
        doc.moveDown();
        
        // Add website details
        doc.fontSize(12)
           .text('Gerad-Fashion', { align: 'center' })
           .text('www.geradfashion.shop', { align: 'center' })
           .text('Contact: geradfashion@gmail.com', { align: 'center' });
        doc.moveDown();

        // Date Range
        const startDate = dateRange.start.format('DD-MM-YYYY');
        const endDate = dateRange.end.format('DD-MM-YYYY');
        doc.text(`Report Period: ${startDate} to ${endDate}`, { align: 'center' });
        doc.moveDown().moveDown();

        // Summary Section
        const summaryStats = await this.getQuickStats(dateRange);
        doc.fontSize(14).text('Summary Statistics', { underline: true });
        doc.fontSize(10)
           .text(`Total Revenue: $${summaryStats.totalRevenue.toFixed(2)}`)
           .text(`Total Orders: ${summaryStats.totalOrders}`)
           .text(`Total Discount: $${summaryStats.totalDiscount.toFixed(2)}`)
           .text(`Average Order Value: $${summaryStats.avgOrderValue.toFixed(2)}`)
           .text(`Completed Orders: ${summaryStats.totalCompletedOrders}`)
           .text(`Cancelled Orders: ${summaryStats.totalCancelledOrders}`);
        doc.moveDown().moveDown();

        // Daily Sales Breakdown
        doc.fontSize(14).text('Daily Sales Breakdown', { underline: true });
        doc.moveDown();

        // Table headers
        const startY = doc.y;
        doc.fontSize(10);
        let currentY = startY;

        // Draw table headers
        const headers = ['Date', 'Orders', 'Revenue', 'Discount', 'Net Revenue'];
        const columnWidth = 100;
        headers.forEach((header, i) => {
            doc.text(header, 50 + (i * columnWidth), currentY);
        });

        currentY += 20;

        // Draw table rows
        salesData.forEach((data) => {
            if (currentY > 700) { // Check if we need a new page
                doc.addPage();
                currentY = 50;
            }

            const netRevenue = data.totalRevenue - data.totalDiscount;
            
            doc.text(moment(data._id).format('DD-MM-YYYY'), 50, currentY)
               .text(data.totalOrders.toString(), 50 + columnWidth, currentY)
               .text(`$${data.totalRevenue.toFixed(2)}`, 50 + (columnWidth * 2), currentY)
               .text(`$${data.totalDiscount.toFixed(2)}`, 50 + (columnWidth * 3), currentY)
               .text(`$${netRevenue.toFixed(2)}`, 50 + (columnWidth * 4), currentY);

            currentY += 20;
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
                topCategories,
                topBrands,
                recentOrders,
                paymentMethodStats
            ] = await Promise.all([
                dashboardService.getQuickStats(dateRange),
                dashboardService.getPeriodComparison(dateRange, previousRange),
                dashboardService.getSalesAnalytics(dateRange),
                dashboardService.getTopProducts(dateRange),
                dashboardService.getTopCategories(dateRange),
                dashboardService.getTopBrands(dateRange),
                dashboardService.getRecentOrders(dateRange),
                dashboardService.getPaymentMethodStats(dateRange)
            ]);
            
            res.render('dashboard', {
                ...quickStats,
                periodComparison,
                salesAnalytics,
                topProducts,
                topCategories,
                topBrands,
                recentOrders,
                paymentMethodStats,
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
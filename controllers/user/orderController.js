const { Order, Address } = require('../../models/orderSchema');
const Product = require('../../models/productSchema');
const Cart = require("../../models/cartSchema");
const Coupon = require("../../models/couponSchema")
const Wallet = require("../../models/walletSchema")
const mongoose = require('mongoose');
const { format } = require('date-fns');
const User = require("../../models/userSchema")
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');


const placeOrder = async (req, res) => {
    try {
        const { addressId, paymentMethod, couponCode, paymentDetails } = req.body;
        const userId = req.session.user?.id;
        const DELIVERY_CHARGE = 250;
        const FREE_DELIVERY_THRESHOLD = 1000;

        if (!userId) {
            return res.status(401).json({ success: false, message: 'User not authenticated.' });
        }

        // Fetch cart and validate items
        const cart = await Cart.findOne({ userId }).populate('items.productId', 'category');

        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ success: false, message: 'Cart is empty.' });
        }

        const quantityErrors = [];
        for (const item of cart.items) {
            const product = await Product.findById(item.productId._id);
            if (!product) {
                quantityErrors.push(`Product ${item.productId.productName} is no longer available`);
            } else if (product.quantity < item.quantity) {
                quantityErrors.push(`Only ${product.quantity} units available for ${product.productName}. You requested ${item.quantity}`);
            }
        }

        if (quantityErrors.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Quantity issues found',
                quantityErrors
            });
        }



        // Validate address
        const userAddress = await Address.findOne({ 
            userId, 
            'address._id': addressId 
        });
        
        if (!userAddress) {
            return res.status(404).json({ success: false, message: 'Address not found.' });
        }

        const addressDetails = userAddress.address.find(addr => addr._id.toString() === addressId);
        if (!addressDetails) {
            return res.status(404).json({ success: false, message: 'Specific address not found.' });
        }

        // Calculate initial total
        let subtotal = cart.items.reduce((sum, item) => sum + item.totalPrice, 0);
        let discountAmount = 0;
        let couponApplied = false;
        let appliedCouponCode = null;

        // Calculate delivery charge
        const deliveryCharge = subtotal < FREE_DELIVERY_THRESHOLD ? DELIVERY_CHARGE : 0;

        // Handle coupon if provided
        if (couponCode) {
            const coupon = await Coupon.findOne({ 
                code: couponCode, 
                isActive: true,
                validUntil: { $gt: new Date() },
                maxUses: { $gt: 0 }
            });

            if (coupon) {
                // Calculate discount based on subtotal (before delivery charge)
                if (coupon.discountType === 'percentage') {
                    discountAmount = (subtotal * coupon.discountValue) / 100;
                    if (coupon.maxDiscount) {
                        discountAmount = Math.min(discountAmount, coupon.maxDiscount);
                    }
                } else if (coupon.discountType === 'flat') {
                    discountAmount = Math.min(coupon.discountValue, subtotal);
                }

                couponApplied = true;
                appliedCouponCode = coupon.code;

                // Update coupon usage
                await Coupon.findByIdAndUpdate(coupon._id, {
                    $inc: { 
                        usedCount: 1,
                        maxUses: -1
                    }
                });
            }
        }

        // Calculate final amount including delivery charge
        const finalAmount = subtotal - discountAmount + deliveryCharge;

        // Prepare order data according to schema
        const orderData = {
            user: userId,
    paymentMethod,
    orderedItems: cart.items.map(item => ({
        product: item.productId._id,
        quantity: item.quantity,
        category: item.category || item.productId.category, // Use product's category as fallback
        price: item.totalPrice,
        status: 'Pending'
    })),
            totalPrice: subtotal,
            discount: discountAmount,
            deliveryCharge,
            finalAmount,
            address: {
                name: addressDetails.name,
                street: addressDetails.street,
                city: addressDetails.city,
                state: addressDetails.state,
                pincode: addressDetails.pincode,
                phone: addressDetails.phone,
                addressType: addressDetails.addressType
            },
            status: 'Pending',
            createdOn: new Date(),
            coupon: {
                applied: couponApplied,
                code: appliedCouponCode,
                discountAmount: discountAmount
            },
            invoiceDate: new Date(),
            paymentDetails: paymentMethod === 'razorpay' ? {
                razorpayPaymentId: paymentDetails?.razorpay_payment_id,
                razorpayOrderId: paymentDetails?.razorpay_order_id,
                razorpaySignature: paymentDetails?.razorpay_signature,
                paymentStatus: 'Completed'  // For Razorpay
            } : {
                paymentStatus: 'Pending'    // For Cash on Delivery
            }


        };

        // Create and save order
        const order = new Order(orderData);
        await order.save();

        // Update product stock
        for (const item of cart.items) {
            await Product.findByIdAndUpdate(item.productId._id, {
                $inc: { quantity: -item.quantity }
            });
        }

        // Clear cart
        await Cart.deleteOne({ userId });

        return res.json({ 
            success: true, 
            message: "Order placed successfully!",
            orderId: order.orderId,
            orderDetails: {
                orderId: order.orderId,  // Ensure this is included
                subtotal,
                deliveryCharge,
                discountAmount,
                finalAmount,
                couponApplied,
                freeDeliveryEligible: subtotal >= FREE_DELIVERY_THRESHOLD,
                amountForFreeDelivery: subtotal < FREE_DELIVERY_THRESHOLD ? 
                    FREE_DELIVERY_THRESHOLD - subtotal : 0
            }
        });

    } catch (error) {
        console.error('Error placing order:', error);
        res.status(500).json({ success: false, message: "Error placing order." });
    }
};





// const cancelOrderItem = async (req, res) => {
//     try {
//         const { orderId, itemId } = req.params;
//         const userId = req.session.user?.id;

//         const order = await Order.findById(orderId);
//         if (!order) {
//             return res.status(404).json({ message: 'Order not found' });
//         }

//         // Find the specific item in the order
//         const orderItem = order.orderedItems.id(itemId);
//         if (!orderItem) {
//             return res.status(404).json({ message: 'Order item not found' });
//         }

//         if (orderItem.status === 'Cancelled') {
//             return res.status(400).json({ message: 'Item is already cancelled' });
//         }

//         if (order.status !== 'Pending') {
//             return res.status(400).json({ message: 'Can only cancel items from pending orders' });
//         }

//         // Update product stock first
//         await Product.findByIdAndUpdate(
//             orderItem.product,
//             { $inc: { quantity: orderItem.quantity } }
//         );

//         // Update order item status
//         orderItem.status = 'Cancelled';

//         // Check if all items in the order are cancelled
//         const allItemsCancelled = order.orderedItems.every(item => 
//             item.status === 'Cancelled'
//         );

//         if (allItemsCancelled) {
//             order.status = 'Cancelled';
//         }

//         // Process refund only if payment method is Razorpay
//         let refundAmount = 0;
//         if (order.paymentMethod === 'razorpay') {
//             const totalPrice = orderItem.price; // Total price of the cancelled item
//             const discountAmount = order.discount?.discount || 0; // Get discount amount, default to 0 if not present

//             // Calculate the refund amount
//             refundAmount = totalPrice - discountAmount; // Full price refunded, consider discount in business logic if needed
            
//             // Find or create wallet
//             let wallet = await Wallet.findOne({ userId });
//             if (!wallet) {
//                 wallet = new Wallet({
//                     userId,
//                     balance: 0,
//                     transactionHistory: []
//                 });
//             }

//             // Add refund to wallet using the schema method
//             await wallet.addMoney(refundAmount, `Refund for cancelled order item #${order.orderId}`);

//             // Update final amount (if needed)
//             order.finalAmount -= refundAmount;

//             // Save the order
//             await order.save();

//             return res.status(200).json({
//                 success: true,
//                 message: 'Item cancelled successfully',
//                 order,
//                 refundAmount,
//                 walletMessage: `₹${refundAmount} has been added to your wallet`
//             });
//         }

//         // Save the order without refund if not Razorpay
//         await order.save();

//         res.status(200).json({
//             success: true,
//             message: 'Item cancelled successfully',
//             order,
//             walletMessage: null // No refund message since it's not Razorpay
//         });

//     } catch (error) {
//         console.error('Error cancelling order item:', error);
//         res.status(500).json({ 
//             success: false,
//             message: 'An error occurred while cancelling the item'
//         });
//     }
// };


const cancelOrderItem = async (req, res) => {
    try {
        const { orderId, itemId } = req.params;
        const userId = req.session.user?.id;

        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Find the specific item in the order
        const orderItem = order.orderedItems.id(itemId);
        if (!orderItem) {
            return res.status(404).json({ message: 'Order item not found' });
        }

        if (orderItem.status === 'Cancelled') {
            return res.status(400).json({ message: 'Item is already cancelled' });
        }

        if (order.status !== 'Pending') {
            return res.status(400).json({ message: 'Can only cancel items from pending orders' });
        }

        // Update product stock
        await Product.findByIdAndUpdate(
            orderItem.product,
            { $inc: { quantity: orderItem.quantity } }
        );

        // Calculate refund amount
        const refundDetails = order.calculateItemRefundAmount(itemId);

        // Update order item status
        orderItem.status = 'Cancelled';
        orderItem.cancelRequest = {
            requested: true,
            requestDate: new Date(),
            status: 'approved'
        };

        // Check if all items are cancelled
        const allItemsCancelled = order.orderedItems.every(item => 
            item.status === 'Cancelled'
        );

        if (allItemsCancelled) {
            order.status = 'Cancelled';
        }

        // Process refund if payment method is Razorpay
        if (order.paymentMethod === 'razorpay' || order.paymentMethod === 'wallet') {
            // Find or create wallet
            let wallet = await Wallet.findOne({ userId });
            if (!wallet) {
                wallet = new Wallet({
                    userId,
                    balance: 0,
                    transactionHistory: []
                });
            }

            // Add refund to wallet
            await wallet.addMoney(
                refundDetails.refundAmount,
                `Refund for cancelled item from order #${order.orderId}`
            );

            // Update the final amount in the order
            order.finalAmount -= refundDetails.refundAmount;

            // Save the order
            await order.save();

            return res.status(200).json({
                success: true,
                message: 'Item cancelled successfully',
                order,
                refundDetails,
                walletMessage: `₹${refundDetails.refundAmount.toFixed(2)} has been added to your wallet`
            });
        }

        // Save the order without refund if not Razorpay
        await order.save();

        res.status(200).json({
            success: true,
            message: 'Item cancelled successfully',
            order,
            refundDetails,
            walletMessage: null
        });

    } catch (error) {
        console.error('Error cancelling order item:', error);
        res.status(500).json({ 
            success: false,
            message: 'An error occurred while cancelling the item'
        });
    }
};



const trackOrder = async (req, res) => {
    try {

        const user = req.session.user;

        // Check if the user is logged in
        if (!user) {
          return res.redirect('/login'); // If user is not logged in, redirect to login
        }
    
        const userId = user.id; // Now safely access the user ID
        const userData = await User.findById(userId); // Fetch user data
    
        // Check if the user data is found, if not, redirect to login
        if (!userData) {
          return res.redirect('/login');
        }


        const orderId = req.params.orderId;

        const order = await Order.findById(orderId)
            .populate({
                path: 'orderedItems.product',
                select: 'productName price productImage'
            })
            .populate('user', 'name email');

        if (!order) {
            return res.status(404).render('tracking', { 
                error: 'Order not found',
                orderData: null
            });
        }

        // Define tracking stages and their corresponding status codes
        const trackingStages = [
            { status: 'ordered', label: 'Order Placed', icon: 'shopping-bag' },
            { status: 'confirmed', label: 'Order Confirmed', icon: 'check-circle' },
            { status: 'processing', label: 'Processing', icon: 'clock' },
            { status: 'shipped', label: 'Shipped', icon: 'truck' },
            { status: 'delivered', label: 'Delivered', icon: 'package' }
        ];

        // Find current stage index
        const currentStageIndex = trackingStages.findIndex(stage => 
            stage.status === order.status);

        // Process tracking timeline
        const trackingTimeline = trackingStages.map((stage, index) => ({
            ...stage,
            isCompleted: index <= currentStageIndex,
            isCurrent: index === currentStageIndex,
            date: order.statusUpdates?.find(update => 
                update.status === stage.status)?.date || null
        }));

        // Format order data for template
        const orderData = {
            orderId: order._id,
            orderDate: format(order.createdOn, 'MMM dd, yyyy'),
            status: order.status,
            trackingNumber: order.trackingNumber || 'Pending',
            estimatedDelivery: order.estimatedDelivery 
                ? format(order.estimatedDelivery, 'MMM dd, yyyy')
                : 'Calculating...',
            items: order.orderedItems.map(item => ({
                name: item.product.productName,
                quantity: item.quantity,
                price: item.price,
                image: item.product.productImage?.[0] 
                    ? `/uploads/product-images/${item.product.productImage[0]}`
                    : '/images/placeholder.jpg',
                subtotal: item.price * item.quantity
            })),
            subtotal: order.totalPrice,
            deliveryCharge: order.deliveryCharge,
            discountAmount: order.discount,
            finalAmount: order.finalAmount,
            couponApplied: order.coupon.applied,
            appliedCouponCode: order.coupon.code || '',
            shippingAddress: order.address || {},  // Ensure it's an object
            trackingTimeline,
            paymentStatus: order.paymentStatus
        };

        res.render('tracking', { 
            user: userData ,
            orderData,
            error: null,
            helpers: {
                formatCurrency: (amount) => `₹${Number(amount).toFixed(2)}`,
                formatDate: (date) => format(new Date(date), 'MMM dd, yyyy')
            }
        });
        
    } catch (error) {
        console.error('Error tracking order:', error);
        res.status(500).render('tracking', { 
            error: 'Unable to fetch order details',
            orderData: null
        });
    }
};

const getOrderDetails = async (req, res) => {
    try {
        const orderId = req.params.orderId;
        const order = await Order.findById(orderId)
            .populate({
                path: 'orderedItems.product',
                select: 'productName price productImage images'
            });

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        res.json(order);
    } catch (error) {
        console.error('Error fetching order details:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch order details' 
        });
    }
};





const downloadInvoice = async (req, res) => {
    try {
        const orderId = req.params.id;
        const order = await Order.findById(orderId)
            .populate('orderedItems.product')
            .populate({
                path: 'orderedItems.category',
                select: 'name'
            });

        if (!order) {
            return res.status(404).send('Order not found');
        }

        // Check if the entire order is cancelled
        if (order.status === 'Cancelled') {
            return res.status(400).json({
                status: 'error',
                message: 'Cannot generate invoice for cancelled orders'
            });
        }

        // Helper functions
        const formatCurrency = amount => `₹${Number(amount).toFixed(2)}`;
        const formatDate = date => new Date(date).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        // Create PDF document
        const doc = new PDFDocument({
            size: 'A4',
            margin: 50,
            bufferPages: true
        });

        // Set response headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=GeradFashion-invoice-${order.orderId}.pdf`);
        doc.pipe(res);

        // Brand colors
        const colors = {
            primary: '#000000',
            secondary: '#666666',
            accent: '#D4AF37',
            light: '#F5F5F5',
            white: '#FFFFFF',
            red: '#FF0000'
        };

        // Draw watermark based on order status
        const drawWatermark = () => {
            if (['Returned', 'Return Requested', 'Return Approved'].includes(order.status)) {
                doc.save();
                doc.rotate(45, { origin: [doc.page.width / 2, doc.page.height / 2] });
                doc.fontSize(60);
                doc.fillColor('rgba(255, 0, 0, 0.2)');
                doc.text('RETURNED', 0, 0, {
                    align: 'center',
                    valign: 'center'
                });
                doc.restore();
            }
        };

        // Header section (same as before)
        const drawHeader = () => {
            doc.save()
               .moveTo(0, 0)
               .lineTo(595.28, 0)
               .lineTo(595.28, 140)
               .lineTo(0, 100)
               .fill(colors.primary);

            doc.fillColor(colors.white)
               .font('Helvetica-Bold')
               .fontSize(36)
               .text('GERAD', 50, 25)
               .fontSize(30)
               .text('FASHION', 50, 60)
               .fontSize(12)
               .font('Helvetica')
               .text('Premium Fashion & Lifestyle', 50, 90);
        };

        // Modified Invoice details section
        const drawInvoiceDetails = () => {
            const startY = 160;
            
            doc.fontSize(24)
               .fillColor(colors.primary)
               .text('INVOICE', 50, startY)
               .moveDown(1);

            doc.fontSize(12)
               .font('Helvetica-Bold')
               .text('BILLING DETAILS', 50, doc.y)
               .moveDown(0.5)
               .fontSize(10)
               .font('Helvetica')
               .fillColor(colors.secondary);

            const billingDetails = [
                order.address.name,
                order.address.street || '',
                `${order.address.city}, ${order.address.state} ${order.address.pincode}`,
                `Phone: ${order.address.phone || 'N/A'}`
            ];

            billingDetails.forEach(line => {
                doc.text(line, 50, doc.y + 5);
            });

            const detailsX = 360;
            const detailsY = startY + 40;
            const invoiceDetails = [
                { label: 'Invoice No:', value: order.orderId },
                { label: 'Date:', value: formatDate(order.createdOn) },
                { label: 'Order Status:', value: order.status },
                { label: 'Payment Method:', value: order.paymentMethod }
            ];

            invoiceDetails.forEach((detail, idx) => {
                doc.font('Helvetica-Bold')
                   .fillColor(colors.primary)
                   .text(detail.label, detailsX, detailsY + (idx * 28))
                   .font('Helvetica')
                   .fillColor(colors.secondary)
                   .text(detail.value, detailsX + 100, detailsY + (idx * 25));
            });
        };

        // Modified Order items table
        const drawOrderItems = () => {
            const startY = 340;
            const pageHeight = doc.page.height - 150;
            let currentY = startY;

            const drawTableHeader = (y) => {
                doc.rect(50, y, 495, 30).fill(colors.primary);
                
                const headers = ['Item Details', 'Qty', 'Unit Price', 'Status', 'Total'];
                const widths = [220, 55, 75, 70, 75];
                let x = 60;

                headers.forEach((header, i) => {
                    doc.fillColor(colors.white)
                       .font('Helvetica-Bold')
                       .fontSize(10)
                       .text(header, x, y + 10, { width: widths[i] });
                    x += widths[i];
                });

                return y + 30;
            };

            currentY = drawTableHeader(currentY);

            // Filter out cancelled items if needed
            const itemsToShow = order.orderedItems.filter(item => 
                item.status !== 'Cancelled' && item.status !== 'Cancel Requested'
            );

            itemsToShow.forEach((item, index) => {
                const rowHeight = 70;

                if (currentY + rowHeight > pageHeight) {
                    doc.addPage();
                    currentY = 60;
                    currentY = drawTableHeader(currentY);
                }

                doc.rect(50, currentY, 495, rowHeight)
                   .fill(index % 2 === 0 ? colors.light : colors.white);

                // Item details with status indicator
                doc.fillColor(colors.primary)
                   .font('Helvetica-Bold')
                   .fontSize(10)
                   .text(item.product.productName, 60, currentY + 10, { width: 210 })
                   .font('Helvetica')
                   .fontSize(9)
                   .fillColor(colors.secondary)
                   .text(`Category: ${item.category.name || 'N/A'}`, 60, currentY + 45);

                // Quantity
                doc.fontSize(10)
                   .text(item.quantity, 280, currentY + 25);

                // Unit price
                doc.text(formatCurrency(item.price / item.quantity), 335, currentY + 25);

                // Status
                const statusColor = item.status === 'Returned' ? colors.red : colors.secondary;
                doc.fillColor(statusColor)
                   .text(item.status, 410, currentY + 25);

                // Total
                doc.font('Helvetica-Bold')
                   .fillColor(colors.primary)
                   .text(formatCurrency(item.price), 485, currentY + 25);

                currentY += rowHeight;
            });

            return currentY;
        };

        // Modified Summary section
        const drawSummary = (startY) => {
            const summaryX = 300;
            const summaryWidth = 260;

            doc.rect(summaryX, startY, summaryWidth, 165)
               .fill(colors.primary);

            const summaryItems = [
                ['Subtotal:', formatCurrency(order.totalPrice)],
                ['Shipping:', order.deliveryCharge > 0 ? formatCurrency(order.deliveryCharge) : 'FREE'],
                order.coupon?.applied ? 
                    [`Discount (${order.coupon.code}):`, `-${formatCurrency(order.coupon.discountAmount)}`] : null,
                ['Total:', formatCurrency(order.finalAmount)]
            ].filter(Boolean);

            // Add refund information if order is returned
            if (order.return && order.return.refundAmount) {
                summaryItems.push(['Refund Amount:', `-${formatCurrency(order.return.refundAmount)}`]);
                summaryItems.push(['Final Amount:', formatCurrency(order.finalAmount - order.return.refundAmount)]);
            }

            summaryItems.forEach((item, i) => {
                const isLast = i === summaryItems.length - 1;
                const itemY = startY + 20 + (i * 25);
                
                doc.fillColor(colors.white)
                   .font(isLast ? 'Helvetica-Bold' : 'Helvetica')
                   .fontSize(isLast ? 12 : 10)
                   .text(item[0], summaryX + 20, itemY)
                   .text(item[1], summaryX + 180, itemY, { align: 'right' });
            });

            return startY + 140;
        };

        // Footer section (same as before)
        const drawFooter = () => {
            const footerHeight = 80;
            const footerY = doc.page.height - footerHeight;

            doc.rect(0, footerY, 595.28, footerHeight)
               .fill(colors.primary);

            doc.fillColor(colors.white)
               .fontSize(10)
               .text('Thank you for shopping with GeradFashion!', 50, footerY + 20, { align: 'center' })
               .moveDown(0.5)
               .fontSize(8)
               .text('For support, contact us at support@geradfashion.com', { align: 'center' })
               .text('Follow us @GeradFashion', { align: 'center' });
        };

        // Draw all sections
        drawWatermark();
        drawHeader();
        drawInvoiceDetails();
        const itemsEndY = drawOrderItems();
        const summaryEndY = drawSummary(itemsEndY + 20);
        drawFooter();

        doc.end();
    } catch (err) {
        console.error('Error generating invoice:', err);
        return res.status(500).json({
            status: 'error',
            message: 'Error downloading invoice',
            error: err.message
        });
    }
};


const loadorder = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.redirect('/login');
          }
          
          const userData = await User.findById(req.session.user.id);
        if (!userData) {
            return res.status(404).render('page-404', { message: 'User not found' });
        }

        const addresses = await Address.find({ userId: userData.id });
        
        // Fetch ALL orders for the user without coupon filter
        const orders = await Order.find({ 
            user: userData._id
        })
        .populate({
            path: 'orderedItems.product',
            select: 'productName price productImage images' 
        })
        .sort({ createdOn: -1 });

        const processedOrders = orders.map(order => {
            const orderObj = order.toObject();
            orderObj.orderedItems = order.orderedItems.map(item => {
              const productImage = item.product && item.product.productImage && item.product.productImage.length > 0
                ? path.join('/uploads/product-images', item.product.productImage[0])
                : '/placeholder-image.jpg';
          
              return {
                _id: item._id,
                product: item.product,
                quantity: item.quantity,
                price: item.price,
                status: item.status || 'Pending',
                productImage: productImage,
              };
            });
            return orderObj;
          });
        // Extract coupon history only from orders that used coupons
        const couponHistory = orders
            .filter(order => order.coupon && order.coupon.applied)
            .map(order => ({
                orderId: order.orderId,
                couponCode: order.coupon.code,
                discountAmount: order.coupon.discountAmount,
                orderTotal: order.totalPrice,
                finalAmount: order.finalAmount,
                usedOn: order.createdOn
            }));

        let wallet = await Wallet.findOne({ userId: userData._id });
        if (!wallet) {
            wallet = new Wallet({
                userId: userData._id,
                balance: 0,
                transactionHistory: []
            });
            await wallet.save();
        }

        res.render('orders', { 
            user: userData, 
            addresses: addresses, 
            orders: processedOrders,
            wallet: wallet,
            couponHistory: couponHistory,
            helpers: {
                formatDate: function(date) {
                    return new Date(date).toLocaleDateString('en-US', {
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric'
                    });
                },
                formatCurrency: function(amount) {
                    if (amount === undefined || amount === null) {
                        console.log('Undefined/null amount detected');
                        return '₹0.00';
                    }
                    return '₹' + Number(amount).toFixed(2);
                }
            }
        });
    } catch (error) {
        console.error('Error loading profile:', error);
        res.status(500).render('page-404', { message: 'Server error occurred' });
    }
};
const loadOrderDetails = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.redirect('/login');
        }

        const orderId = req.params.orderId;
        const userData = await User.findById(req.session.user.id);

        if (!userData) {
            return res.status(404).render('page-404', { message: 'User not found' });
        }

        // Fetch the order with populated product and category details
        const order = await Order.findOne({
            _id: orderId,
            user: userData._id
        }).populate({
            path: 'orderedItems.product',
            select: 'productName price productImage images'
        }).populate('orderedItems.category');

        if (!order) {
            return res.status(404).render('page-404', { message: 'Order not found' });
        }

        // Process order details
        const processedOrder = order.toObject();

        // Process ordered items
        processedOrder.orderedItems = order.orderedItems.map(item => {
            const productData = item.product || {
                productName: 'Product Unavailable',
                price: item.price || 0,
                productImage: []
            };

            // Calculate item total
            const itemTotal = item.price * item.quantity;

            // Process product image
            const productImage = productData.productImage && productData.productImage.length > 0
                ? `/uploads/product-images/${productData.productImage[0]}`
                : '/placeholder-image.jpg';

            return {
                _id: item._id, // Ensure item ID is available
                product: productData,
                productImage: productImage,
                quantity: item.quantity,
                price: item.price,
                itemTotal: itemTotal,
                status: item.status || 'Pending',
                cancelRequest: item.cancelRequest || {},
                returnRequest: item.returnRequest || {}
            };
        });

        // Map shipping address from schema format to template format
        processedOrder.shippingAddress = {
            fullName: order.address?.name || userData.fullName,
            addressLine1: order.address?.street || '',
            addressLine2: '',  // If you want to split street into two lines
            city: order.address?.city || '',
            state: order.address?.state || '',
            pincode: order.address?.pincode || '',
            mobile: order.address?.phone || userData.mobile,
            addressType: order.address?.addressType || 'Home'
        };

        // Process payment and price details
        processedOrder.paymentMethod = order.paymentMethod;
        processedOrder.paymentStatus = order.paymentStatus || 'Pending';
        processedOrder.totalPrice = order.totalPrice;
        processedOrder.finalAmount = order.finalAmount;
        processedOrder.deliveryCharge = order.deliveryCharge || 0;
        
        // Process coupon details if exists
        if (order.coupon && order.coupon.applied) {
            processedOrder.coupon = {
                applied: true,
                code: order.coupon.code,
                discountAmount: order.coupon.discountAmount || order.discount || 0
            };
        }

        // Add return request details if exists
        if (order.return && order.return.requested) {
            processedOrder.return = {
                ...order.return,
                timeline: order.return.timeline || []
            };
        }

        // Helper functions for the template
        const helpers = {
            formatDate: function(date) {
                if (!date) return 'Date not available';
                return new Date(date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
            },
            formatCurrency: function(amount) {
                if (typeof amount !== 'number') return '₹0.00';
                return new Intl.NumberFormat('en-IN', {
                    style: 'currency',
                    currency: 'INR',
                    minimumFractionDigits: 2
                }).format(amount);
            },
            getStatusClass: function(status) {
                const statusClasses = {
                    'Pending': 'bg-amber-50 text-amber-700 border border-amber-200',
                    'Processing': 'bg-blue-50 text-blue-700 border border-blue-200',
                    'Shipped': 'bg-indigo-50 text-indigo-700 border border-indigo-200',
                    'Delivered': 'bg-green-50 text-green-700 border border-green-200',
                    'Cancelled': 'bg-red-50 text-red-700 border border-red-200',
                    'Return Requested': 'bg-purple-50 text-purple-700 border border-purple-200',
                    'Returned': 'bg-gray-50 text-gray-700 border border-gray-200'
                };
                return statusClasses[status] || 'bg-gray-50 text-gray-700 border border-gray-200';
            },
            getReturnReasonDisplay: function(reason) {
                const reasonMap = {
                    'size_too_small': 'Size Too Small',
                    'size_too_large': 'Size Too Large',
                    'different_from_picture': 'Different From Picture',
                    'quality_issues': 'Quality Issues',
                    'wrong_item': 'Wrong Item Received',
                    'damage': 'Item Damaged',
                    'style_fit': 'Style/Fit Issue',
                    'fabric_issues': 'Fabric Issues',
                    'color_difference': 'Color Different',
                    'wrong_size': 'Wrong Size',
                    'defective': 'Defective Item',
                    'not_as_described': 'Not As Described',
                    'changed_mind': 'Changed Mind',
                    'other': 'Other'
                };
                return reasonMap[reason] || reason;
            }
        };

        res.render('order-details', {
            user: userData,
            order: {
                ...processedOrder,
                _id: orderId, // Ensure order ID is available at the top level
            },
            helpers: helpers
        });

    } catch (error) {
        console.error('Error loading order details:', error);
        res.status(500).render('page-404', { 
            message: 'An error occurred while loading order details. Please try again later.'
        });
    }
};



module.exports = {
    placeOrder,
    // cancelOrder,
    cancelOrderItem,
    trackOrder ,
    getOrderDetails,
    downloadInvoice,
    loadorder,
    loadOrderDetails
  
}

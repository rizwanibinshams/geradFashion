const Coupon = require('../../models/couponSchema');
const Cart = require("../../models/cartSchema")

// Controller for creating a new coupon


const createCoupon = async (req, res) => {
  try {
    const { code, discountType, discountValue, validFrom, validUntil, maxUses, isActive, minPurchase } = req.body;
    console.log('Coupon Data Received:', req.body);

   
    if (!code || !discountType || !discountValue || !validFrom || !validUntil || !maxUses || !minPurchase) {
      console.log('Missing required fields');
      const coupons = await Coupon.find();
      return res.render('coupon', { 
        error: 'Missing required fields', 
        coupons, 
        message: null 
      });
    }

   
    const standardizedCode = code.trim().toUpperCase();

    
    const existingCoupon = await Coupon.findOne({
      code: { $regex: new RegExp(`^${standardizedCode}$`, 'i') },
      isDeleted: { $ne: true }
    });

    if (existingCoupon) {
      console.log('Duplicate coupon code:', standardizedCode);
      const coupons = await Coupon.find();
      return res.render('coupon', { 
        error: 'Duplicate coupon code', 
        coupons, 
        message: null 
      });
    }

    
    const newCoupon = new Coupon({
      code: standardizedCode,
      discountType,
      discountValue: Number(discountValue),
      validFrom: new Date(validFrom),
      validUntil: new Date(validUntil),
      maxUses: Number(maxUses),
      isActive: isActive === 'on' || isActive === true,
      minPurchase: Number(minPurchase),
      usedCount: 0,
      userId: []
    });

   
    await newCoupon.save();
    console.log('Coupon saved successfully:', newCoupon);
    const coupons = await Coupon.find();
    return res.render('coupon', { 
      message: 'Coupon created successfully', 
      coupons, 
      error: null 
    });

  } catch (error) {
    console.error('Error saving coupon:', error);
    if (error.code === 11000) {
      const coupons = await Coupon.find();
      return res.render('coupon', { 
        error: 'Duplicate coupon code', 
        coupons, 
        message: null 
      });
    }
    return res.redirect('/admin/pageerror');
  }
};





const updateCoupon = async (req, res) => {
  try {
    const updateData = req.body;
    const couponId = updateData.couponId;

    console.log('Update request received:', { couponId, updateData });

    // Validate coupon ID
    if (!couponId || !couponId.match(/^[0-9a-fA-F]{24}$/)) {
      console.log('Invalid or missing coupon ID');
      const coupons = await Coupon.find();
      return res.render('coupon', { 
        error: 'Invalid or missing coupon ID', 
        coupons, 
        message: null 
      });
    }

   
    const existingCoupon = await Coupon.findById(couponId);
    
    if (!existingCoupon) {
      console.log('Coupon not found');
      const coupons = await Coupon.find();
      return res.render('coupon', { error: 'Coupon not found', coupons });
    }

   
    const updatedCode = updateData.code ? updateData.code.trim().toUpperCase() : existingCoupon.code;

   
    if (updatedCode !== existingCoupon.code) {
      const duplicateCheck = await Coupon.findOne({
        code: updatedCode,
        _id: { $ne: couponId }
      });

      if (duplicateCheck) {
        console.log('Duplicate coupon code found:', updatedCode);
        const coupons = await Coupon.find();
        return res.render('coupon', { error: 'Duplicate coupon code found', coupons });
      }
    }

    
    const isActive = updateData.isActive === 'on' || updateData.isActive === true;

   
    const updates = {
      code: updatedCode,
      discountType: updateData.discountType || existingCoupon.discountType,
      discountValue: updateData.discountValue ? Number(updateData.discountValue) : existingCoupon.discountValue,
      validFrom: updateData.validFrom ? new Date(updateData.validFrom) : existingCoupon.validFrom,
      validUntil: updateData.validUntil ? new Date(updateData.validUntil) : existingCoupon.validUntil,
      maxUses: updateData.maxUses ? Number(updateData.maxUses) : existingCoupon.maxUses,
      minPurchase: updateData.minPurchase ? Number(updateData.minPurchase) : existingCoupon.minPurchase,
      isActive
    };

  
    await Coupon.findByIdAndUpdate(
      couponId,
      updates,
      { new: true, runValidators: true }
    );

    console.log('Coupon updated successfully');

   
    const coupons = await Coupon.find();
    return res.render('coupon', { 
      message: 'Coupon updated successfully', 
      coupons,
      error: null
    });

  } catch (error) {
    console.error('Error updating coupon:', error);
    return res.redirect('/admin/pageerror');
  }
};




const applyCoupon = async (req, res) => {
  try {
    const { couponCode } = req.body;
    const userId = req.session.user?.id;

    if (!userId) {
      return res.json({
        success: false,
        message: 'User not authenticated'
      });
    }

   
    const cart = await Cart.findOne({ userId })
      .populate({ path: 'items.productId', select: 'salePrice name' });

    if (!cart || !cart.items || cart.items.length === 0) {
      return res.json({
        success: false,
        message: 'Cart is empty'
      });
    }

    // Calculate cart total
    const cartTotal = cart.items.reduce((total, item) => {
      return total + item.totalPrice; 
    }, 0);

   
    const deliveryCharge = cartTotal < 1000 ? 250 : 0; // ₹250 if total is less than ₹1000

    // Find valid coupon
    const coupon = await Coupon.findOne({
      code: couponCode.toUpperCase(),
      isActive: true,
      validUntil: { $gt: new Date() }
    });

    if (!coupon) {
      return res.json({
        success: false,
        message: 'Invalid or expired coupon code'
      });
    }

    
    if (coupon.maxUses === 0) {
      return res.json({
        success: false,
        message: 'Coupon has reached its maximum usage limit'
      });
    }

    
    if (cartTotal < coupon.minPurchase) {
      return res.json({
        success: false,
        message: `Minimum purchase amount of ₹${coupon.minPurchase} is required to apply this coupon`
      });
    }

    // Calculate discount
    let discountAmount = 0;
    if (coupon.discountType === 'percentage') {
      discountAmount = (cartTotal * coupon.discountValue) / 100;
      if (coupon.maxDiscount) {
        discountAmount = Math.min(discountAmount, coupon.maxDiscount);
      }
    } else { // Flat discount
      discountAmount = Math.min(coupon.discountValue, cartTotal);
    }

    // Calculate new total after applying the discount
    const newTotal = cartTotal - discountAmount + deliveryCharge;

   
    req.session.appliedCoupon = {
      code: coupon.code,
      discountAmount: discountAmount,
      deliveryCharge: deliveryCharge,
      originalTotal: cartTotal,
      newTotal: newTotal
    };

    console.log('Coupon applied successfully:', {
      cartTotal,
      discountAmount,
      deliveryCharge,
      newTotal,
      couponCode: coupon.code
    });

    return res.json({
      success: true,
      message: 'Coupon applied successfully',
      discountAmount: discountAmount.toFixed(2),
      deliveryCharge: deliveryCharge.toFixed(2),
      newTotal: newTotal.toFixed(2),
      originalTotal: cartTotal.toFixed(2)
    });
  } catch (error) {
    console.error('Error in applyCoupon:', error);
    return res.json({
      success: false,
      message: 'Error applying coupon',
      error: error.message
    });
  }
};


const removeCoupon = async (req, res) => {
  try {
      const userId = req.session.user?.id;

      if (!userId) {
          return res.json({
              success: false,
              message: 'User not authenticated'
          });
      }

      
      if (!req.session.appliedCoupon) {
          return res.json({
              success: false,
              message: 'No coupon is currently applied'
          });
      }

     
      const cart = await Cart.findOne({ userId })
          .populate({ path: 'items.productId', select: 'salePrice name' });

      if (!cart || !cart.items || cart.items.length === 0) {
          return res.json({
              success: false,
              message: 'Cart is empty'
          });
      }

      
      const cartTotal = cart.items.reduce((total, item) => {
          return total + item.totalPrice;
      }, 0);

      
      delete req.session.appliedCoupon;

      console.log('Coupon removed successfully:', {
          cartTotal,
          userId
      });

      return res.json({
          success: true,
          message: 'Coupon removed successfully',
          newTotal: cartTotal.toFixed(2),
          originalTotal: cartTotal.toFixed(2)
      });

  } catch (error) {
      console.error('Error in removeCoupon:', error);
      return res.json({
          success: false,
          message: 'Error removing coupon',
          error: error.message
      });
  }
};



const deleteCoupon = async (req, res) => {
  try {
    const { id } = req.params;

    const existingCoupon = await Coupon.findById(id);
    if (!existingCoupon) {
      return res.status(404).redirect('/admin/pageerror')
    }

    await Coupon.findByIdAndDelete(id);

    const coupons = await Coupon.find();

    res.status(200).render('coupon', { message: 'Coupon deleted successfully', coupons });
  } catch (error) {
    console.error('Error deleting coupon:', error);
    res.status(500).redirect('/admin/pageerror')
  }
};

const getCouponById = async (req, res) => {
  try {
    const { id } = req.params;
    const coupon = await Coupon.findById(id);
    
    if (!coupon) {
      return res.status(404).json({ message: 'Coupon not found' });
    }

    res.status(200).json(coupon);
  } catch (error) {
    console.error('Error fetching coupon:', error);
    res.status(500).redirect('/admin/pageerror')
  }
};


const getAllCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.find();
   
    res.render('coupon', { 
      coupons,
      error: null,
      message: null
    });
  } catch (error) {
    console.error('Error fetching coupons:', error);
    res.redirect('/admin/pageerror');
  }
};


module.exports = {
  createCoupon,
  getAllCoupons,
  getCouponById,
  updateCoupon,
  deleteCoupon,
  applyCoupon,
  removeCoupon
};

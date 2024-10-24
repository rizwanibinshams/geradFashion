const Coupon = require('../../models/couponSchema');
const Cart = require("../../models/cartSchema")

// Controller for creating a new coupon
const createCoupon = async (req, res) => {
  try {
    const { code, discountType, discountValue, validFrom, validUntil, maxUses, isActive, minPurchase } = req.body;
    console.log('Coupon Data Received:', req.body);

    // Validation: Ensure all required fields are provided
    if (!code || !discountType || !discountValue || !validFrom || !validUntil || !maxUses || !minPurchase) {
      console.log('Missing required fields');
      return res.status(400).redirect('/admin/pageerror');
    }

    // Clean and standardize the coupon code
    const standardizedCode = code.trim().toUpperCase();

    // Check for existing coupon excluding "deleted" coupons
    const existingCoupon = await Coupon.findOne({
      code: { $regex: new RegExp(`^${standardizedCode}$`, 'i') },
      isDeleted: { $ne: true } // Assuming you have a field that marks soft deletes
    });

    if (existingCoupon) {
      console.log('Duplicate coupon code:', standardizedCode);
      return res.status(400).redirect('/admin/pageerror');
    }

    // Create the new coupon with standardized code
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

    // Save with error handling
    try {
      await newCoupon.save();
      console.log('Coupon saved successfully:', newCoupon);
      return res.status(201).redirect('/admin/coupons');
    } catch (saveError) {
      if (saveError.code === 11000) {
        console.log('Duplicate key error during save');
        return res.status(400).redirect('/admin/pageerror');
      }
      throw saveError;
    }
  } catch (error) {
    console.error('Error saving coupon:', error);
    return res.status(500).redirect('/admin/pageerror');
  }
};


// Controller for updating a coupon
const updateCoupon = async (req, res) => {
  try {
    const updateData = req.body;
    const couponId = updateData.couponId;

    console.log('Update request received:', { couponId, updateData });

    // Validate coupon ID
    if (!couponId || !couponId.match(/^[0-9a-fA-F]{24}$/)) {
      console.log('Invalid coupon ID:', couponId);
      return res.status(400).redirect('/admin/pageerror');
    }

    // Find the existing coupon
    const existingCoupon = await Coupon.findById(couponId);
    if (!existingCoupon) {
      console.log('Coupon not found:', couponId);
      return res.status(404).redirect('/admin/pageerror');
    }

    // Log the existing coupon's code for comparison
    console.log('Current coupon code:', existingCoupon.code);

    // Prepare the updated code
    const updatedCode = updateData.code ? updateData.code.trim().toUpperCase() : existingCoupon.code.trim().toUpperCase();

    // Check if the code is actually changing
    if (updatedCode !== existingCoupon.code.trim().toUpperCase()) {
      const duplicateCheck = await Coupon.findOne({
        code: { $regex: new RegExp(`^${updatedCode}$`, 'i') },
        _id: { $ne: couponId } // Exclude the current coupon being updated
      });

      if (duplicateCheck) {
        console.log('Duplicate coupon code found:', updatedCode);
        return res.status(400).redirect('/admin/pageerror');
      }
    } else {
      console.log('No change in coupon code, skipping duplicate check.');
    }

    // Handle isActive properly
    const isActive = updateData.isActive === 'on' || updateData.isActive === true;

    // Prepare the update object with proper type conversions
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

    console.log('Update object prepared:', updates);

    // Update using findByIdAndUpdate
    const updatedCoupon = await Coupon.findByIdAndUpdate(
      couponId,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!updatedCoupon) {
      console.log('No coupon found to update');
      return res.status(404).redirect('/admin/pageerror');
    }

    console.log('Coupon updated successfully:', updatedCoupon);

    // Fetch updated list of coupons
    const coupons = await Coupon.find();
    return res.render('coupon', { message: 'Coupon updated successfully', coupons });
  } catch (error) {
    console.error('Error updating coupon:', error);
    return res.status(500).redirect('/admin/pageerror');
  }
};


// Controller for applying a coupon with minPurchase validation
// const applyCoupon = async (req, res) => {
//   try {
//     const { couponCode } = req.body;
//     const userId = req.session.user?.id;

//     if (!userId) {
//       return res.json({
//         success: false,
//         message: 'User not authenticated'
//       });
//     }

//     const cart = await Cart.findOne({ userId })
//       .populate({ path: 'items.productId', select: 'salePrice name' });

//     if (!cart || !cart.items || cart.items.length === 0) {
//       return res.json({
//         success: false,
//         message: 'Cart is empty'
//       });
//     }

//     // Calculate cart total
//     const cartTotal = cart.items.reduce((total, item) => {
//       return total + item.totalPrice;
//     }, 0);

//     // Find valid coupon
//     const coupon = await Coupon.findOne({
//       code: couponCode.toUpperCase(),
//       isActive: true,
//       validUntil: { $gt: new Date() }
//     });

//     if (!coupon) {
//       return res.json({
//         success: false,
//         message: 'Invalid or expired coupon code'
//       });
//     }

//     // Check if cart total meets the minPurchase requirement
//     if (cartTotal < coupon.minPurchase) {
//       return res.json({
//         success: false,
//         message: `Minimum purchase amount of ${coupon.minPurchase} is required to apply this coupon`
//       });
//     }

//     // Calculate discount
//     let discountAmount = 0;
//     if (coupon.discountType === 'percentage') {
//       discountAmount = (cartTotal * coupon.discountValue) / 100;
//       if (coupon.maxDiscount) {
//         discountAmount = Math.min(discountAmount, coupon.maxDiscount);
//       }
//     } else {
//       discountAmount = Math.min(coupon.discountValue, cartTotal);
//     }

//     const newTotal = cartTotal - discountAmount;

//     // Store in session
//     req.session.appliedCoupon = {
//       code: coupon.code,
//       discountAmount: discountAmount,
//       originalTotal: cartTotal,
//       newTotal: newTotal
//     };

//     console.log('Coupon applied successfully:', {
//       cartTotal,
//       discountAmount,
//       newTotal,
//       couponCode: coupon.code
//     });

//     return res.json({
//       success: true,
//       message: 'Coupon applied successfully',
//       discountAmount: discountAmount.toFixed(2),
//       newTotal: newTotal.toFixed(2),
//       originalTotal: cartTotal.toFixed(2)
//     });
//   } catch (error) {
//     console.error('Error in applyCoupon:', error);
//     return res.json({
//       success: false,
//       message: 'Error applying coupon',
//       error: error.message
//     });
//   }
// };


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

    // Retrieve the user's cart
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
      return total + item.totalPrice; // Ensure item.totalPrice reflects the item's price
    }, 0);

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

    // Check if coupon maxUses is greater than 0 (if 0, it's not allowed to be applied)
    if (coupon.maxUses === 0) {
      return res.json({
        success: false,
        message: 'Coupon has reached its maximum usage limit'
      });
    }

    // Check if cart total meets the minPurchase requirement
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
    const newTotal = cartTotal - discountAmount;

    // Store applied coupon details in the session
    req.session.appliedCoupon = {
      code: coupon.code,
      discountAmount: discountAmount,
      originalTotal: cartTotal,
      newTotal: newTotal
    };

    console.log('Coupon applied successfully:', {
      cartTotal,
      discountAmount,
      newTotal,
      couponCode: coupon.code
    });

    return res.json({
      success: true,
      message: 'Coupon applied successfully',
      discountAmount: discountAmount.toFixed(2),
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
    res.status(200).render('coupon', { coupons });
  } catch (error) {
    res.status(500).redirect('/admin/pageerror')
  }
};


module.exports = {
  createCoupon,
  getAllCoupons,
  getCouponById,
  updateCoupon,
  deleteCoupon,
  applyCoupon
};

const Address = require('../../models/addressSchema');
const user = require('../../models/userSchema');

// Add a new address
const addAddress = async (req, res) => {
    try {
        

        const {
            name,
            addressType,
            street,
            landMark,
            city,
            state,
            pincode,
            phone,
            altPhone
        } = req.body;

        // Validate the request body
        if (!name||!addressType || !street || !city || !state || !pincode || !phone) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        const userId = req.session.user?.id; 
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        console.log("User ID:", userId); 

        // Find the address document by userId
        let userAddress = await Address.findOne({ userId });

        if (!userAddress) {
           
            userAddress = new Address({
                userId,
                address: [{
                    name,
                    addressType,
                    street,
                    landMark,
                    city,
                    state,
                    pincode,
                    phone,
                    altPhone
                }]
            });
        } else {
            
            const existingAddress = userAddress.address.find(addr => 
                addr.addressType === addressType && addr.street === street && addr.city === city
            );

            if (existingAddress) {
                return res.status(409).json({ error: 'This address already exists' });
            }

           
            userAddress.address.push({
                name,
                addressType,
                street,
                landMark,
                city,
                state,
                pincode,
                phone,
                altPhone
            });
        }

        await userAddress.save();
       

        
res.redirect("/address") 

    } catch (error) {
        console.error("Error adding address:", error.message); 
        res.status(500).json({ error: 'An error occurred while adding the address' });
    }
};


const CheckoutaddAddress = async (req, res) => {
    try {
       

        const {
            name,
            addressType,
            street,
            landMark,
            city,
            state,
            pincode,
            phone,
            altPhone
        } = req.body;

        // Validate the request body
        if (!name||!addressType || !street || !city || !state || !pincode || !phone) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        const userId = req.session.user?.id; 
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        console.log("User ID:", userId); 

        
        let userAddress = await Address.findOne({ userId });

        if (!userAddress) {
           
            userAddress = new Address({
                userId,
                address: [{
                    name,
                    addressType,
                    street,
                    landMark,
                    city,
                    state,
                    pincode,
                    phone,
                    altPhone
                }]
            });
        } else {
            
            const existingAddress = userAddress.address.find(addr => 
                addr.landMark === landMark && addr.street === street 
            );

            if (existingAddress) {
                return res.status(409).json({ error: 'This address already exists' });
            }

          
            userAddress.address.push({
                name,
                addressType,
                street,
                landMark,
                city,
                state,
                pincode,
                phone,
                altPhone
            });
        }

        await userAddress.save();
        
        
res.status(201).json({ address: userAddress.address[userAddress.address.length - 1] });

    } catch (error) {
        console.error("Error adding address:", error.message); 
        res.status(500).json({ error: 'An error occurred while adding the address' });
    }
};

const getAddressById = async (req, res) => {
    try {
        console.log('Request params:', req.params);
        console.log('Request user:', req.user);

        const { id } = req.params; 
        if (!id) {
            console.log('Address ID is missing in the request parameters');
            return res.status(400).json({ error: 'Address ID is required' });
        }

        const userId = req.user.id;
        if (!userId) {
            console.log('User ID is missing in the user object');
            return res.status(400).json({ error: 'User ID is missing' });
        }

        console.log(`Fetching address with ID: ${id} for user: ${userId}`);

        const userAddress = await Address.findOne({ userId });
        if (!userAddress) {
            console.log('User address document not found');
            return res.status(404).json({ error: 'User address not found' });
        }

        console.log('User address document:', userAddress);

        if (!userAddress.address || !Array.isArray(userAddress.address)) {
            console.log('User address document does not have a valid address array');
            return res.status(500).json({ error: 'Invalid address data structure' });
        }

        const address = userAddress.address.find(addr => addr._id.toString() === id);
        if (!address) {
            console.log(`Address with ID ${id} not found in user's addresses`);
            return res.status(404).json({ error: 'Address not found' });
        }

        console.log('Found address:', address);

        res.json({ address });
    } catch (error) {
        console.error('Error in getAddressById:', error);
        res.status(500).json({ error: 'An error occurred while fetching the address', details: error.message });
    }
};


const editAddress = async (req, res) => {
    try {
        const { id } = req.params; 
        const { name,addressType, street, city, landMark, state, pincode, phone, altPhone } = req.body;

        console.log('Request Params:', req.params);
        console.log('Request Body:', req.body);
        console.log('Authenticated user:', req.user);

        const userId = req.user.id; 
        console.log('Authenticated User ID:', userId);

        if (!userId) {
            return res.status(401).json({ error: 'User ID is undefined' });
        }

       
        const userAddress = await Address.findOne({ userId, 'address._id': id });
        if (!userAddress) {
            console.error('User address not found for user ID:', userId);
            return res.status(404).json({ error: 'User address not found' });
        }

        const addressToEdit = userAddress.address.id(id);
        if (!addressToEdit) {
            console.error('Address not found for ID:', id);
            return res.status(404).json({ error: 'Address not found' });
        }

        console.log('Updating address:', addressToEdit);

       
        addressToEdit.name = name;
        addressToEdit.addressType = addressType;
        addressToEdit.street = street;
        addressToEdit.city = city;
        addressToEdit.landMark = landMark;
        addressToEdit.state = state;
        addressToEdit.pincode = pincode;
        addressToEdit.phone = phone;
        addressToEdit.altPhone = altPhone;

        await userAddress.save(); 

        console.log('Address updated successfully:', addressToEdit);
        return res.json({ message: 'Address updated successfully', address: addressToEdit });
    } catch (error) {
        console.error('Error updating address:', error);
        return res.status(500).json({ error: 'An error occurred while editing the address', details: error.message });
    }
};



// Remove an address
const removeAddress = async (req, res) => {
    try {
        const { id } = req.params; 
        const userId = req.user.id; 

        console.log('User ID:', userId);
        console.log('Address ID:', id);

        
        const userAddress = await Address.findOne({ userId });
        if (!userAddress) {
            console.error('User address document not found');
            return res.status(404).json({ error: 'User address document not found' });
        }

        console.log('User Address Document:', userAddress);
        console.log('User Addresses:', userAddress.address);

        //  remove the address from the array by its ID
        userAddress.address = userAddress.address.filter(address => address._id.toString() !== id);
        
       
        await userAddress.save();
        
        console.log('Address removed successfully');
        res.json({ message: 'Address removed successfully', addresses: userAddress.address });
    } catch (error) {
        console.error('Error removing address:', error);
        res.status(500).json({ error: 'An error occurred while removing the address' });
    }
};


// Get all addresses for the authenticated user
const getAddresses = async (req, res) => {
    try {
        const userId = req.user._id;

       
        const userAddress = await Address.findOne({ userId });
        if (!userAddress) {
            return res.status(404).json({ error: 'No addresses found' });
        }

        res.json(userAddress.address); 
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while fetching addresses' });
    }
};


const setDefaultAddress = async (req, res) => {
    const userId = req.user?._id || req.session.user?.id;
    const addressId = req.params.addressId;

    try {
        // Find the user's address document
        const userAddress = await Address.findOne({ userId });
        if (!userAddress) return res.status(404).json({ success: false, message: "User address not found" });

       
        userAddress.address.forEach((addr) => {
            addr.isDefault = false;
        });

        
        const defaultAddress = userAddress.address.id(addressId);
        if (!defaultAddress) return res.status(404).json({ success: false, message: "Address not found" });
        
        defaultAddress.isDefault = true;

       
        await userAddress.save();

        res.json({ success: true, message: "Default address set successfully" });
    } catch (error) {
        console.error("Error setting default address:", error);
        res.status(500).json({ success: false, message: "Failed to set default address" });
    }
};


const adres = async (req, res) => {
    try {
        // Fetch addresses data
        const userId = req.session.user?.id;
        const userData = await user.findById(userId);
        const addresses = await Address.find({ userId });
        res.render('addresses', { addresses,
            user:userData,
            user: userData,
            userEmail: req.session.user?.email
         });
    } catch (error) {
        res.status(500).send('Error loading addresses');
    }
}

module.exports ={
    addAddress,
    editAddress,
    removeAddress,
    getAddresses,
    getAddressById,
    setDefaultAddress,
    CheckoutaddAddress,
    adres
}
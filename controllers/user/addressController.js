const Address = require('../../models/addressSchema');

// Add a new address
const addAddress = async (req, res) => {
    try {
        console.log("user eksdf", req.user); // Check user
        console.log("body dvbjhvd", req.body); // Check request body

        const {
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
        if (!addressType || !street || !city || !state || !pincode || !phone) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        const userId = req.session.user?.id; // Ensure user is authenticated
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        console.log("User ID:", userId); // Log the user ID

        // Find the address document by userId
        let userAddress = await Address.findOne({ userId });

        if (!userAddress) {
            // Create a new address document if it doesn't exist
            userAddress = new Address({
                userId,
                address: [{
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
            // Check if the address already exists to avoid duplicates
            const existingAddress = userAddress.address.find(addr => 
                addr.addressType === addressType && addr.street === street && addr.city === city
            );

            if (existingAddress) {
                return res.status(409).json({ error: 'This address already exists' });
            }

            // Push the new address into the array
            userAddress.address.push({
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
        // Redirect to the profile page after successfully adding the address
        res.redirect('/profile'); // Adjust the route to your actual profile page route
    } catch (error) {
        console.error("Error adding address:", error.message); // Log specific error message
        res.status(500).json({ error: 'An error occurred while adding the address' });
    }
};

const getAddressById = async (req, res) => {
    try {
        console.log('Request params:', req.params);
        console.log('Request user:', req.user);

        const { id } = req.params; // Address ID from the URL
        if (!id) {
            console.log('Address ID is missing in the request parameters');
            return res.status(400).json({ error: 'Address ID is required' });
        }

        const userId = req.user.id; // Use req.user.id instead of req.user._id
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

// Edit an existing address
const editAddress = async (req, res) => {
    try {
        const { id } = req.params; // Address ID from the URL parameters
        const { addressType, street, city, landMark, state, pincode, phone, altPhone } = req.body;

        console.log('Request Params:', req.params);
        console.log('Request Body:', req.body);
        console.log('Authenticated user:', req.user);

        const userId = req.user.id; // Use the correct property for user ID
        console.log('Authenticated User ID:', userId);

        if (!userId) {
            return res.status(401).json({ error: 'User ID is undefined' });
        }

        // Fetch user's address with the given address ID
        const userAddress = await Address.findOne({ userId, 'address._id': id }); // Adjust query accordingly
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

        // Update the address fields
        addressToEdit.addressType = addressType;
        addressToEdit.street = street;
        addressToEdit.city = city;
        addressToEdit.landMark = landMark;
        addressToEdit.state = state;
        addressToEdit.pincode = pincode;
        addressToEdit.phone = phone;
        addressToEdit.altPhone = altPhone;

        await userAddress.save(); // Save the updated address

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
        const { id } = req.params; // Address ID within the address array
        const userId = req.user.id; // Extract the user ID correctly

        console.log('User ID:', userId);
        console.log('Address ID:', id);

        // Find the user's address document
        const userAddress = await Address.findOne({ userId });
        if (!userAddress) {
            console.error('User address document not found');
            return res.status(404).json({ error: 'User address document not found' });
        }

        console.log('User Address Document:', userAddress);
        console.log('User Addresses:', userAddress.address);

        // Use filter to remove the address from the array by its ID
        userAddress.address = userAddress.address.filter(address => address._id.toString() !== id);
        
        // Save the updated user address document
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

        // Find the user's address document
        const userAddress = await Address.findOne({ userId });
        if (!userAddress) {
            return res.status(404).json({ error: 'No addresses found' });
        }

        res.json(userAddress.address); // Return all addresses for the user
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while fetching addresses' });
    }
};


module.exports ={
    addAddress,
    editAddress,
    removeAddress,
    getAddresses,
    getAddressById
}
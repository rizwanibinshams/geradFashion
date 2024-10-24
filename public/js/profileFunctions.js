
    
        // Function to delete the address
        async function deleteAddress(id) {
            const confirmation = confirm("Are you sure you want to delete this address?");
            if (confirmation) {
                try {
                    const response = await fetch(`/addresses/${id}`, {
                        method: 'DELETE',
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    });
                    const data = await response.json();
                    if (response.ok) {
                        location.reload();
                    } else {
                        alert(data.error);
                    }
                } catch (error) {
                    console.error("Error deleting address:", error);
                    alert('An error occurred while deleting the address.');
                }
            }
        }
        
        async function editAddress(id) {
    try {
        const response = await fetch(`/addresses/${id}`);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to fetch address details');
        }

        const address = data.address;
        if (!address) {
            throw new Error('Address data is missing or undefined');
        }

        document.getElementById('editAddressId').value = id;
        document.getElementById('editAddressName').value = address.name || '';
        document.getElementById('editAddressType').value = address.addressType || '';
        document.getElementById('editAddressStreet').value = address.street || '';
        document.getElementById('editAddressCity').value = address.city || '';
        document.getElementById('editAddressLandMark').value = address.landMark || '';
        document.getElementById('editAddressState').value = address.state || '';
        document.getElementById('editAddressPincode').value = address.pincode || '';
        document.getElementById('editAddressPhone').value = address.phone || '';
        document.getElementById('editAddressAltPhone').value = address.altPhone || '';

        // Clear any existing error messages
        const errorElements = document.querySelectorAll('#editAddressModal .text-red-500');
        errorElements.forEach(el => el.innerText = '');

        document.getElementById('editAddressModal').style.display = 'flex';
    } catch (error) {
        console.error('Error in editAddress function:', error);
        alert(`An error occurred while fetching address details: ${error.message}`);
    }
}
        function logModalValues() {
            console.log('Modal values:');
            console.log('name', document.getElementById('editAddressName').value);
            console.log('Type:', document.getElementById('editAddressType').value);
            console.log('Street:', document.getElementById('editAddressStreet').value);
            console.log('City:', document.getElementById('editAddressCity').value);
            console.log('Landmark:', document.getElementById('editAddressLandMark').value);
            console.log('State:', document.getElementById('editAddressState').value);
            console.log('Pincode:', document.getElementById('editAddressPincode').value);
            console.log('Phone:', document.getElementById('editAddressPhone').value);
            console.log('Alt Phone:', document.getElementById('editAddressAltPhone').value);
        }
        
        document.getElementById('editAddressForm').onsubmit = async function (event) {
            event.preventDefault(); // Prevent the default form submission
            const id = document.getElementById('editAddressId').value; // Get ID from a hidden input in the form
        
            // Call the editAddress function with the extracted ID
            await editAddress(id); 
        };
        document.getElementById('editAddressForm').onsubmit = async function (event) {
            event.preventDefault(); // Prevent the default form submission
            const id = document.getElementById('editAddressId').value; // Get ID from a hidden input in the form
        
            // Call the updateAddress function with the form data
            await updateAddress(id); 
        };
        
       
// Utility function to validate input fields
function validateField(value, regex, errorElement, errorMessage) {
    if (!regex.test(value)) {
        errorElement.innerText = errorMessage;
        return false;
    }
    errorElement.innerText = '';
    return true;
}

// Utility function to validate required fields
function validateRequired(value, errorElement, fieldName) {
    if (!value.trim()) {
        errorElement.innerText = `${fieldName} is required.`;
        return false;
    }
    errorElement.innerText = '';
    return true;
}

// Regex patterns for validation
const patterns = {
    name: /^[A-Za-z\s.,'&@-]{2,50}$/,
    phone: /^[6-9]\d{9}$/,
    pincode: /^\d{6}$/,
    street: /^[A-Za-z0-9\s.,'&@-]{5,100}$/,
    landMark: /^[A-Za-z0-9\s.,'&@-]{3,50}$/,
    city: /^[A-Za-z\s.,'&@-]{2,30}$/,
    state: /^[A-Za-z\s.,'&@-]{2,30}$/
};

// Function to validate all fields in a form
function validateAddressForm(formId, errorPrefix = '') {
    const form = document.getElementById(formId);
    let isValid = true;

    // Validate Name
    isValid = validateRequired(form.name.value, document.getElementById(`${errorPrefix}NameError`), 'Name') && isValid;
    isValid = validateField(form.name.value, patterns.name, document.getElementById(`${errorPrefix}NameError`), 'Please enter a valid name (2-50 characters)') && isValid;

    // Validate Street
    isValid = validateRequired(form.street.value, document.getElementById(`${errorPrefix}StreetError`), 'Street') && isValid;
    isValid = validateField(form.street.value, patterns.street, document.getElementById(`${errorPrefix}StreetError`), 'Please enter a valid street address (5-100 characters)') && isValid;

    // Validate Landmark
    isValid = validateRequired(form.landMark.value, document.getElementById(`${errorPrefix}LandMarkError`), 'Landmark') && isValid;
    isValid = validateField(form.landMark.value, patterns.landMark, document.getElementById(`${errorPrefix}LandMarkError`), 'Please enter a valid landmark (3-50 characters)') && isValid;

    // Validate City
    isValid = validateRequired(form.city.value, document.getElementById(`${errorPrefix}CityError`), 'City') && isValid;
    isValid = validateField(form.city.value, patterns.city, document.getElementById(`${errorPrefix}CityError`), 'Please enter a valid city name (2-30 characters)') && isValid;

    // Validate State
    isValid = validateRequired(form.state.value, document.getElementById(`${errorPrefix}StateError`), 'State') && isValid;
    isValid = validateField(form.state.value, patterns.state, document.getElementById(`${errorPrefix}StateError`), 'Please enter a valid state name (2-30 characters)') && isValid;

    // Validate Phone
    isValid = validateRequired(form.phone.value, document.getElementById(`${errorPrefix}PhoneError`), 'Phone') && isValid;
    isValid = validateField(form.phone.value, patterns.phone, document.getElementById(`${errorPrefix}PhoneError`), 'Please enter a valid 10-digit phone number') && isValid;

    // Validate Pincode
    isValid = validateRequired(form.pincode.value, document.getElementById(`${errorPrefix}PincodeError`), 'Pincode') && isValid;
    isValid = validateField(form.pincode.value, patterns.pincode, document.getElementById(`${errorPrefix}PincodeError`), 'Please enter a valid 6-digit pincode') && isValid;

    // Validate Alternate Phone (if provided)
    if (form.altPhone.value) {
        isValid = validateField(form.altPhone.value, patterns.phone, document.getElementById(`${errorPrefix}AltPhoneError`), 'Please enter a valid 10-digit alternate phone number') && isValid;
    } else {
        document.getElementById(`${errorPrefix}AltPhoneError`).innerText = '';
    }

    return isValid;
}

// Validation for Add New Address form
document.getElementById('addAddressForm').addEventListener('submit', function(event) {
    event.preventDefault();
    if (validateAddressForm('addAddressForm')) {
        this.submit();
    }
});

// Validation for Edit Address form
document.getElementById('editAddressForm').addEventListener('submit', function(event) {
    event.preventDefault();
    if (validateAddressForm('editAddressForm', 'edit')) {
        updateAddress(this.id.value);
    }
});

// Function to update address
async function updateAddress(id) {
    if (!validateAddressForm('editAddressForm', 'edit')) {
        return; // Stop the function if validation fails
    }

    const form = document.getElementById('editAddressForm');
    const addressData = {
        name: form.name.value,
        addressType: form.addressType.value,
        street: form.street.value,
        city: form.city.value,
        landMark: form.landMark.value,
        state: form.state.value,
        pincode: form.pincode.value,
        phone: form.phone.value,
        altPhone: form.altPhone.value,
    };

    try {
        const response = await fetch(`/addresses/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(addressData),
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to update address');
        }

        console.log('Address updated successfully:', data);
        document.getElementById('updateSuccessMessage').innerText = 'Address updated successfully!';
        setTimeout(() => {
            location.reload();
        }, 2000);
    } catch (error) {
        console.error('Error updating address:', error);
        document.getElementById('updateErrorMessage').innerText = `An error occurred while updating the address: ${error.message}`;
    }
}

// Add input event listeners for real-time validation
function addInputListeners(formId, errorPrefix = '') {
    const form = document.getElementById(formId);
    const fields = ['name', 'street', 'landMark', 'city', 'state', 'phone', 'pincode', 'altPhone'];

    fields.forEach(field => {
        form[field].addEventListener('input', function() {
            if (this.value.trim()) {
                validateField(this.value, patterns[field], document.getElementById(`${errorPrefix}${field.charAt(0).toUpperCase() + field.slice(1)}Error`), `Please enter a valid ${field}`);
            } else {
                document.getElementById(`${errorPrefix}${field.charAt(0).toUpperCase() + field.slice(1)}Error`).innerText = '';
            }
        });
    });
}

// Add input listeners to both forms
addInputListeners('addAddressForm');
addInputListeners('editAddressForm', 'edit');
        // Function to close the modal
        function closeModal() {
    document.getElementById('editAddressModal').style.display = 'none';
    document.getElementById('editAddressForm').reset();
    const errorElements = document.querySelectorAll('#editAddressModal .text-red-500');
    errorElements.forEach(el => el.innerText = '');
    document.getElementById('updateSuccessMessage').innerText = '';
    document.getElementById('updateErrorMessage').innerText = '';
}
        // Event listener for opening the modal
        document.querySelectorAll('.edit-address-button').forEach(button => {
            button.addEventListener('click', function() {
                const id = this.getAttribute('data-id');
                editAddress(id);
            });
        });
         // Check the URL for the update success parameter
         const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('update') === 'success') {
                alert('Profile updated successfully!');
            } else if (urlParams.get('update') === 'error') {
                alert('An error occurred while updating the profile.');
            }
        
        
        
        //cancel order 
        
        function cancelOrder(orderId) {
            if (confirm('Are you sure you want to cancel this order?')) {
                fetch(`/orders/${orderId}/cancel`, { method: 'POST' })
                    .then(response => response.json())
                    .then(data => {
                        if (data.message === 'Order cancelled successfully') {
                            alert('Order cancelled successfully');
                            location.reload(); // Refresh the page to reflect the changes
                        } else {
                            alert('Failed to cancel order: ' + data.message);
                        }
                    })
                    .catch(error => {
                        console.error('Error:', error);
                        alert('An error occurred while cancelling the order');
                    });
            }
        }


        //edit profile

        // Utility function to validate input fields
function validateProfileField(value, regex, errorElement, errorMessage) {
    if (!regex.test(value)) {
        errorElement.textContent = errorMessage;
        return false;
    }
    errorElement.textContent = '';
    return true;
}

// Regex patterns for validation
const profilePatterns = {
    name: /^[A-Za-z\s.,'&@-]{2,50}$/,
    email: /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/,
    phone: /^[6-9]\d{9}$/
};

// Function to validate all fields in the profile form
function validateProfileForm() {
    const form = document.querySelector('form[action="/update-profile"]');
    let isValid = true;

    // Validate Name
    const nameError = document.createElement('span');
    nameError.className = 'text-red-500 text-sm';
    form.name.parentNode.appendChild(nameError);
    isValid = validateProfileField(form.name.value, profilePatterns.name, nameError, 'Please enter a valid name (2-50 characters)') && isValid;

    // Validate Email
    const emailError = document.createElement('span');
    emailError.className = 'text-red-500 text-sm';
    form.email.parentNode.appendChild(emailError);
    isValid = validateProfileField(form.email.value, profilePatterns.email, emailError, 'Please enter a valid email address') && isValid;

    // Validate Phone
    const phoneError = document.createElement('span');
    phoneError.className = 'text-red-500 text-sm';
    form.phone.parentNode.appendChild(phoneError);
    isValid = validateProfileField(form.phone.value, profilePatterns.phone, phoneError, 'Please enter a valid 10-digit phone number') && isValid;

    return isValid;
}

// Add event listener for form submission
document.addEventListener('DOMContentLoaded', function() {
    const form = document.querySelector('form[action="/update-profile"]');
    if (form) {
        form.addEventListener('submit', function(event) {
            event.preventDefault();
            if (validateProfileForm()) {
                this.submit();
            }
        });

        // Add input event listeners for real-time validation
        ['name', 'email', 'phone'].forEach(field => {
            form[field].addEventListener('input', function() {
                const errorElement = this.parentNode.querySelector('.text-red-500');
                validateProfileField(this.value, profilePatterns[field], errorElement, `Please enter a valid ${field}`);
            });
        });
    }
});
        
          
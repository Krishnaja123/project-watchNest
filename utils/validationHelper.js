const validateAddress = (data) => {
    
    const { name, locality, city, state, pincode, mobile, alternateNumber } = data;

    const indianMobileRegex = /^(?:\+91|91)?[6-9]\d{9}$/;
     const nameRegex = /^[A-Za-z ]+$/;

    if (!name?.trim() || !locality?.trim() || !city?.trim() || !state?.trim() || !pincode?.trim() || !mobile?.trim()) {
        return "Please fill all mandatory field";
    }

    if (name.trim().length < 3) {
        return "Name must be atleast 3 characters";
    }

    if (!nameRegex.test(name.trim())) {
        return "Name can contain only letters and spaces";
    }

    if (locality.trim().length < 3) {
        return "Please enter a valid locality";
    }

    if (!nameRegex.test(city.trim())) {
        return "City can contain only letters and spaces";
    }

    if (!/^[0-9]{6}$/.test(pincode)) {
        return "Pincode must be 6 digits";
        req.session.type = "error";
    }

    if (!indianMobileRegex.test(mobile)) {
        return "Phone number must be 10 digits";
    }

    if (alternateNumber && !indianMobileRegex.test(alternateNumber)) {
        return "Phone number must be 10 digits";
    }

    if (
        alternateNumber &&
        alternateNumber.trim() === mobile.trim()
    ) {
        return "Alternate mobile number cannot be the same as mobile number";
    }
     
    return null;
}

module.exports = {
    validateAddress,
}
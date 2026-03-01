const validateAddress = (data) => {
    
    const { name, locality, city, state, pincode, mobile, alternateNumber } = data;

    const indianMobileRegex = /^(?:\+91|91)?[6-9]\d{9}$/;

    if (!name || !locality || !city || !state || !pincode || !mobile) {
        return "Please fill all mandatory field";
    }

    if (name.length < 3) {
        return "Name must be atleast 3 characters";
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
     
    return null;
}

module.exports = {
    validateAddress,
}
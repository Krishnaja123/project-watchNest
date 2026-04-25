document.addEventListener("DOMContentLoaded", function () {

    // ===== ELEMENTS =====
    const form = document.getElementById('addres-form');
    if (!form) return; // prevent errors if modal not present

    const idInput = document.getElementById('_id');
    const nameInput = document.getElementById('name');
    const localityInput = document.getElementById('locality');
    const cityInput = document.getElementById('city');
    const stateInput = document.getElementById('state');
    const pincodeInput = document.getElementById('pincode');
    const mobileInput = document.getElementById('mobile');
    const alternateNumberInput = document.getElementById('alternateNumber');

    const nameError = document.getElementById('error-name');
    const localityError = document.getElementById('error-locality');
    const cityError = document.getElementById('error-city');
    const stateError = document.getElementById('error-state');
    const pincodeError = document.getElementById('error-pincode');
    const mobileError = document.getElementById('error-mobile');
    const alternateNumberError = document.getElementById('error-alternateNumber');

    const modal = document.getElementById("addressModal");
    const openModalBtn = document.getElementById("openModalBtn");
    const closeModal = document.querySelector(".close-modal");

    const modalTitle = document.getElementById("modalTitle");
    const saveBtn = document.getElementById("saveBtn");

    // ===== OPEN MODAL =====
    if (openModalBtn) {
        openModalBtn.addEventListener("click", function () {
            modal.style.display = "flex";
            form.reset();
            idInput.value = "";

            clearErrors();

            modalTitle.textContent = "Add New Address";
            saveBtn.textContent = "Save Address";
        });
    }

    // ===== CLOSE MODAL =====
    if (closeModal) {
        closeModal.addEventListener("click", function () {
            modal.style.display = "none";
        });
    }

    window.addEventListener("click", function (e) {
        if (e.target === modal) {
            modal.style.display = "none";
        }
    });

    // ===== VALIDATION =====
    form.addEventListener('submit', function (e) {
        e.preventDefault();

        const isValid =
            validateName() &
            validateLocality() &
            validateCity() &
            validateState() &
            validatePincode() &
            validateMobileNumber() &
            validateAlternateNumber();

        if (isValid) {
            form.submit();
        }
    });

    function clearErrors() {
        document.querySelectorAll(".error-message").forEach(el => el.textContent = "");
    }

    function validateName() {
        const val = nameInput.value.trim();
        if (val.length < 3) {
            nameError.textContent = "Minimum 3 characters required";
            return false;
        }
        nameError.textContent = "";
        return true;
    }

    function validateLocality() {
        const val = localityInput.value.trim();
        if (!val) {
            localityError.textContent = "Enter locality";
            return false;
        }
        localityError.textContent = "";
        return true;
    }

    function validateCity() {
        const val = cityInput.value.trim();
        if (!val) {
            cityError.textContent = "Enter city";
            return false;
        }
        cityError.textContent = "";
        return true;
    }

    function validateState() {
        const val = stateInput.value.trim();
        if (!val) {
            stateError.textContent = "Select state";
            return false;
        }
        stateError.textContent = "";
        return true;
    }

    function validatePincode() {
        const val = pincodeInput.value.trim();
        if (!/^[0-9]{6}$/.test(val)) {
            pincodeError.textContent = "Invalid pincode";
            return false;
        }
        pincodeError.textContent = "";
        return true;
    }

    function validateMobileNumber() {
        const val = mobileInput.value.trim();
        if (!/^(?:\+91|91)?[6-9]\d{9}$/.test(val)) {
            mobileError.textContent = "Invalid mobile number";
            return false;
        }
        mobileError.textContent = "";
        return true;
    }

    function validateAlternateNumber() {
        const val = alternateNumberInput.value.trim();
        if (val && !/^(?:\+91|91)?[6-9]\d{9}$/.test(val)) {
            alternateNumberError.textContent = "Invalid number";
            return false;
        }
        alternateNumberError.textContent = "";
        return true;
    }

    // ===== EDIT ADDRESS =====
    const editBtns = document.querySelectorAll(".btn-edit");
    editBtns.forEach(button => {
        button.addEventListener('click', function (e) {
            const errors = document.querySelectorAll(".error-message");
            errors.forEach(error => {
                error.textContent = "";
            })


            const editAddressId = this.id;
            modal.style.display = "flex";
            form.reset();
            idInput.value = "";
            document.getElementById("modalTitle").textContent = "Edit Address";
            document.getElementById("saveBtn").textContent = "Update Address";

            const editAddress = addresses.find(address => {
                return address._id === editAddressId;
            });

            console.log("editAddress: ", editAddress);

            if (!editAddress) return;

            idInput.value = editAddress._id;
            nameInput.value = editAddress.full_name;
            localityInput.value = editAddress.street;
            cityInput.value = editAddress.city;
            stateInput.value = editAddress.state;
            pincodeInput.value = editAddress.postal_code;
            mobileInput.value = editAddress.mobile;
            alternateNumberInput.value = editAddress.phone || "";
        });
    });

});
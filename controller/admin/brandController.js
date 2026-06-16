const mongoose = require("mongoose");
const Brand = require("../../models/brandModel")
const STATUS_CODES = require("../../constants/statusCodes");
const MESSAGES = require("../../constants/messages");

const createBrand = async (req, res) => {
    try {
        let message = req.session.message;
        req.session.message = "";
        let type = req.session.type;
        req.session.type = "";
        return res.render("admin/addBrand", { message, type });
    } catch (error) {
        console.log("server error", error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send(MESSAGES.SERVER_ERROR)
    }
}

const saveBrand = async (req, res) => {
    try {
        const { name, descrip } = req.body;
        //console.log(name, descrip);

        if (!name || !name.trim()) {
            return res.status(STATUS_CODES.BAD_REQUEST).json({
                success: false,
                type: "error",
                message: "Please fill Brand name"
            });
        }

        const trimedName = name.trim();
        const existingBrand = await Brand.findOne({
            name: { $regex: `^${trimedName}$`, $options: "i" },
            is_delete: false
        });
        if (existingBrand) {
            return res.status(STATUS_CODES.BAD_REQUEST).json({
                success: false,
                type: "error",
                message: "Brand name already exists, Please change name"
            });
        }
        await Brand.create({
            name: trimedName,
            descrip
        });
        return res.status(STATUS_CODES.CREATED).json({
            success: true,
            type: "success",
            message: "Successfully created Brand"
        });
    } catch (error) {
        console.log("server error", error);

        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
            success: false,
            type: "error",
            message: MESSAGES.SERVER_ERROR
        });
    }
}

const brands = async (req, res) => {
    try {
        let page = parseInt(req.query.page) || 1;
        let message = req.session.message || "";
        req.session.message = "";
        let type = req.session.type || "";
        req.session.type = "";
        return res.render("admin/brands", { message, type, page });
    } catch (error) {
        console.log("server error", error);
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send(MESSAGES.SERVER_ERROR);
    }
}

const fetchBrands = async (req, res) => {
    try {
        let search = "";
        if (req.query.search) {
            search = req.query.search;
        }

        let page = 1;
        if (req.query.page) {
            page = parseInt(req.query.page);
        }

        const limit = 7;

        let brands = await Brand.find({
            name: { $regex: search, $options: "i" },
            is_delete: false
        }).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit);


        console.log(brands);

        let count = await Brand.find({
            name: { $regex: search },
            is_delete: false
        }).countDocuments();
        console.log(count);

        totalPages = Math.ceil(count / limit);

        return res.json({
            brands,
            totalPages,
            currentPage: page
        })

    } catch (error) {
        console.log("server error", error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send(MESSAGES.SERVER_ERROR);
    }
}

const deleteBrand = async (req, res) => {
    try {
        const id = req.params.id;
        console.log("id: ", id);

        const brand = await Brand.findByIdAndUpdate(id, { is_delete: true }, { new: true });
        console.log("deleted brand: ", brand);
        const brands = await Brand.find({ is_delete: false });
        console.log("remaining categories:", brands);

        if (!brand) {
            console.log("No brand found for id:", id);
            return res.status(STATUS_CODES.NOT_FOUND).json({ error: "Brand not found" });
        }
        else return res.json({ message: "Brand deleted successfully", brands });
    } catch (error) {
        console.log("server error", error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send(MESSAGES.SERVER_ERROR)
    }
}

const brandDetails = async (req, res) => {
    try {
        let message = req.session.message;
        req.session.message = "";
        let type = req.session.type;
        req.session.type = "";
        const brand_id = req.params.id;
        const page = parseInt(req.query.page) || 1;
        const brand = await Brand.findById(brand_id);
        if (!brand) {
            req.session.message = "Brand not found";
            return res.status(STATUS_CODES.NOT_FOUND).send("Brand not found");
        }

        return res.render("admin/editBrand", {
            message,
            type,
            brand,
            page
        });
    } catch (error) {
        console.log("server error", error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send(MESSAGES.SERVER_ERROR);
    }
}

const updateBrand = async (req, res) => {
    try {
        const { _id, name, descrip } = req.body;
        const page = parseInt(req.query.page);
        const existingBrand = await Brand.findById(_id);
        if (!existingBrand) {
            return res.status(STATUS_CODES.NOT_FOUND).json({
                success: false,
                type: "error",
                message: "No brand found with this ID"
            });
        }

        const trimedName = name.trim();

        const updatedBrandExist = await Brand.findOne({
            _id: { $ne: _id },
            is_delete: false,
            name: { $regex: `^${name.trim()}$`, $options: "i" }
        });

        if (updatedBrandExist) {
            return res.status(STATUS_CODES.BAD_REQUEST).json({
                success: false,
                type: "error",
                message: "Brand name already exists"
            });
        }

        const upadateBrand = await Brand.findByIdAndUpdate(_id, { name, descrip });

        return res.json({
            success: true,
            type: "success",
            message: "Brand updated successfully"
        });


    } catch (error) {
        console.log("server error", error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send(MESSAGES.SERVER_ERROR)
    }
}

const viewBrand = async (req, res) => {
    try {
        console.log("enters in to controller");
        const id = req.params.id;
        console.log(id);
        const brand = await Brand.findById(id);
        await Brand.findByIdAndUpdate(id, { $set: { view: !brand.view } });
        const updatedBrand = await Brand.findById(id);
        res.json(updatedBrand);

    } catch (error) {
        console.log("server error", error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send(MESSAGES.SERVER_ERROR)
    }
}


module.exports = {
    createBrand,
    saveBrand,
    brands,
    fetchBrands,
    deleteBrand,
    brandDetails,
    updateBrand,
    viewBrand,
}
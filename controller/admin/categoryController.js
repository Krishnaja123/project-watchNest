const mongoose = require("mongoose");
const Category = require("../../models/categoryModel");
// const { options } = require("pdfkit");

const createCategory = async (req, res) => {
    try {
        let message = req.session.message;
        req.session.message = "";
        let type = req.session.type;
        req.session.type = "";
        return res.render("admin/addCategory", { message, type });
    } catch (error) {
        console.log("server error", error);
        res.status(500).send("server error")
    }
}

// const saveCategory = async (req, res) => {
//     try {
//         const { name, descrip } = req.body;

//         if (!name) {
//             req.session.message = "Please fill Category name";
//             req.session.type = "error";
//             return res.redirect("/admin/category");
//         }
//         const trimedName = name.trim();
//         const existingCategory = await Category.findOne({ name: { $regex: trimedName, $options: "i" }, is_delete: false });
//         if (existingCategory) {
//             req.session.message = "Category already exist";
//             req.session.type = "error";
//             return res.redirect("/admin/category");
//         }
//         const newCategory = await new Category({
//             name,
//             descrip
//         });
//         newCategory.save();
//         req.session.message = "Successfully created Category";
//         req.session.type = "success";
//         return res.redirect("/admin/categories")

//     } catch (error) {
//         console.log("server error", error);
//         res.status(500).send("server error")

//     }
// }

const saveCategory = async (req, res) => {
    console.log("req body", req.body);

    try {
        const { name, descrip } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                type: "error",
                message: "Please fill Category name"
            });
        }

        const trimmedName = name.trim();

        const existingCategory = await Category.findOne({
            name: { $regex: `^${trimmedName}$`, $options: "i" },
            is_delete: false
        });

        if (existingCategory) {
            return res.status(400).json({
                success: false,
                type: "error",
                message: "Category name already exists, Please change name"
            });
        }

        await Category.create({
            name: trimmedName,
            descrip
        });

        return res.status(201).json({
            success: true,
            type: "success",
            message: "Successfully created category"
        });

    } catch (error) {
        console.error("Server Error:", error);

        return res.status(500).json({
            success: false,
            type: "error",
            message: "Internal server error"
        });
    }
};

const categories = async (req, res) => {
    try {
        let page = parseInt(req.query.page) || 1;
        console.log("page number: ", page);
        let message = req.session.message || "";
        req.session.message = "";
        let type = req.session.type || "";
        req.session.type = "";
        return res.render("admin/categories", { message, type, page });
    } catch (error) {
        console.log("server error", error);
        return res.status(500).send("server error");
    }
}

const fetchCategories = async (req, res) => {
    try {
        let search = "";
        if (req.query.search) {
            search = req.query.search;
        }

        let page = 1;
        if (req.query.page) {
            page = parseInt(req.query.page);
            // console.log("page number in fetchcategory: ",page );      
        }

        const limit = 7;

        let categories = await Category.find({
            name: { $regex: search, $options: "i" },
            is_delete: false
        }).sort({ created_at: -1 }).skip((page - 1) * limit).limit(limit);


        console.log(categories);

        let count = await Category.find({
            name: { $regex: search },
            is_delete: false
        }).countDocuments();
        console.log(count);

        totalPages = Math.ceil(count / limit);

        return res.json({
            categories,
            totalPages,
            currentPage: page
        })

    } catch (error) {
        console.log("server error", error);
        res.status(500).send("server error")
    }
}

const deleteCategory = async (req, res) => {
    try {
        const id = req.params.id;
        const category = await Category.findByIdAndUpdate(id, { is_delete: true });
        //console.log("deleted category: ", category);
        const categories = await Category.find({ is_delete: false });
        //console.log("remaining categories:", categories);

        if (!category) {
            return res.status(404).json({ error: "Category not found" });
        }
        else return res.json({ message: "Category deleted successfully", categories });
    } catch (error) {
        console.log("server error", error);
        res.status(500).send("server error")
    }
}

const categoryDetails = async (req, res) => {
    try {
        let message = req.session.message;
        req.session.message = "";
        let type = req.session.type;
        req.session.type = "";
        const category_id = req.params.id;
        const page = parseInt(req.query.page) || 1;
        const category = await Category.findById(category_id);
        if (!category) {
            req.session.message = "Category not found";
            return res.status(404).send("Category not found");
        }

        return res.render("admin/editCategory", {
            message,
            type,
            category,
            page
        });
    } catch (error) {
        console.log("server error", error);
        res.status(500).send("server error");
    }
}

const updateCategory = async (req, res) => {
    try {
        const { _id, name, descrip } = req.body;

        const page = parseInt(req.query.page);

        const existingCategory = await Category.findById(_id);
        console.log("existingCategory: ", existingCategory);

        if (!existingCategory) {
            return res.status(404).json({
                success: false,
                type: "error",
                message: "No category found with this ID"
            });
        }

        const trimmedName = name.trim();

        const updatedCategoryExist = await Category.findOne({
            _id: { $ne: _id },
            name: { $regex: `^${trimmedName}$`, $options: "i" }
        });

        if (updatedCategoryExist) {
            return res.status(400).json({
                success: false,
                type: "error",
                message: "Category name already exists"
            });
        }
        const upadateCategory = await Category.findByIdAndUpdate(_id, { name, descrip });

        return res.json({
            success: true,
            type: "success",
            message: "Category updated successfully"
        });

    } catch (error) {
        console.log("server error", error);
        res.status(500).send("server error")
    }

}

const viewCategory = async (req, res) => {
    try {
        console.log("enters in to controller");
        const id = req.params.id;
        console.log(id);
        const category = await Category.findById(id);
        await Category.findByIdAndUpdate(id, { $set: { view: !category.view } });
        const updatedCategory = await Category.findById(id);
        console.log(updateCategory);
        res.json(updatedCategory);

    } catch (error) {
        console.log("server error", error);
        res.status(500).send("server error")
    }
}

module.exports = {
    createCategory,
    saveCategory,
    categories,
    fetchCategories,
    deleteCategory,
    categoryDetails,
    updateCategory,
    viewCategory,
}
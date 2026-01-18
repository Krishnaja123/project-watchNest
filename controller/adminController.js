const User = require("../models/userModel");
const Category = require("../models/categoryModel");
const Brand = require("../models/brandModel")
const Product = require("../models/productModel");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const multer = require("multer");
// const { name } = require("ejs");
// const upload = require("./config/multerConfig");


const loadLogin = (req, res) => {
    try {
        if (req.session.admin)
            return res.redirect('/admin/customer');
        let message = req.session.message || "";
        req.session.message = "";
        let type = req.session.type || "";
        req.session.type = "";
        res.render('admin/login', { message, type });
    } catch (error) {
        console.log("server error", error);
        res.status(500).send("server error")
    }
}

const login = async (req, res) => {
    const { email, password } = req.body;
    console.log("hi");

    if (!email || !password) {
        console.log("login without data")
        req.session.message = 'Please fill all mandatory fields';
        return res.redirect("/admin/login");
    }
    try {
        const user = await User.findOne({ email }).select('+password_hash');
        if (!user) {
            req.session.message = 'User does not exist';
            return res.redirect("/admin/login");

        }

        if (user.role !== "admin") {
            req.session.message = 'Unauthorized access';
            return res.redirect("/admin/login");

        }

        const isMatchPassword = await bcrypt.compare(password, user.password_hash);

        if (!isMatchPassword) {
            req.session.message = 'Incorrect password';
            return res.redirect("/admin/login");
        }
        req.session.admin = user;
        return res.redirect("/admin/customer");

    } catch (error) {
        console.error("Login error:", error);
        req.session.message = 'Server error. Please try again.';
        return res.redirect("/admin/login");
    }

}

const loadCustomer = async (req, res) => {
    try {
        let page = parseInt(req.query.page) || 1;
        let message = req.session.message || "";
        req.session.message = "";
        res.render('admin/customer', { message, page });
    } catch (error) {
        console.log("server error", error);
        res.status(500).send("server error")
    }

}


const fetchUser = async (req, res) => {

    try {
        console.log("fetch user");

        let search = "";
        if (req.query.search) {
            search = req.query.search;
            console.log(search);
        }
        let page = 1;
        if (req.query.page) {
            page = parseInt(req.query.page);
        }
        const limit = 2;
        let customers = await User.find({
            $or: [
                { username: { $regex: search, $options: "i" } },
                { email: { $regex: search } }
            ]
        }).sort({ created_at: -1 }).skip((page - 1) * limit).limit(limit);

        const count = await User.find({
            $or: [
                { username: { $regex: search } },
                { email: { $regex: search } }
            ]
        }).countDocuments();

        totalPages = Math.ceil(count / limit);

        console.log("fetched user:", customers);
        return res.json({
            customers,
            totalPages,
            currentPage: page
        });
    } catch (error) {
        console.log("server error", error);
        res.status(500).send("server error")
    }
}


const userDetails = async (req, res) => {
    try {
        let message = req.session.message || "";
        req.session.message = "";
        let type = req.session.type || "";
        req.session.type = '';
        const userId = req.params.id;
        const page = parseInt(req.query.page) || 1;
        const user = await User.findOne({ _id: userId });
        if (!user) {
            req.session.message = "User not found";
            return res.status(404).send("User not found");
        }
        res.render('admin/editCustomer', { message, type, user, page });
    } catch (error) {
        console.log("server error", error);
        res.status(500).send("server error")
    }
}

const updateUser = async (req, res) => {
    try {
        const userId = req.params.id;
        const page = parseInt(req.query.page);
        console.log("req.body : ", req.body);

        const { role, status } = req.body;

        console.log(role, status)
        const updateUser = await User.updateOne({ _id: userId }, {
            $set: {
                role: role,
                userStatus: status,
                updated_at: new Date()
            }
        })
        console.log(updateUser);

        res.redirect(`/admin/customer/?page=${page}`);
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
}

// Category

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

const saveCategory = async (req, res) => {
    try {
        const { name, descrip } = req.body;

        if (!name) {
            req.session.message = "Please fill Category name";
            req.session.type = "error";
            return res.redirect("/admin/category");
        }
        const trimedName = name.trim();
        const existingCategory = await Category.findOne({ name: { $regex: trimedName, $options: "i" } });
        if (existingCategory) {
            req.session.message = "Category already exist";
            req.session.type = "error";
            return res.redirect("/admin/category");
        }
        const newCategory = await new Category({
            name,
            descrip
        });
        newCategory.save();
        req.session.message = "Successfully created Category";
        req.session.type = "success";
        return res.redirect("/admin/categories")

    } catch (error) {
        console.log("server error", error);
        res.status(500).send("server error")

    }
}

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

        const limit = 2;

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
        res.status(500).send("server error");
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
            req.session.message = "No category found with this ID";
            req.session.type = "error";
            return res.redirect("/admin/categories")
        }
        const upadateCategory = await Category.findByIdAndUpdate(_id, { name, descrip });

        if (!upadateCategory) {
            req.session.message = "Category not updated, Please try again.";
            req.session.type = "error";
            return res.redirect(`/admin/editCategory/${_id}`);

        }
        req.session.message = "Updated category";
        req.session.type = "success";
        res.redirect(`/admin/categories/?page=${page}`);

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

// // Brands

const createBrand = async (req, res) => {
    try {
        let message = req.session.message;
        req.session.message = "";
        let type = req.session.type;
        req.session.type = "";
        return res.render("admin/addBrand", { message, type });
    } catch (error) {
        console.log("server error", error);
        res.status(500).send("server error")
    }
}

const saveBrand = async (req, res) => {
    try {
        const { name, descrip } = req.body;
        //console.log(name, descrip);

        if (!name) {
            req.session.message = "Please enter brand name";
            req.session.type = "warning";
            return res.redirect("/admin/brand");
        }

        const trimedName = name.trim();
        const existingBrand = await Brand.findOne({ name: { $regex: trimedName, $options: "i" } });
        if (existingBrand) {
            req.session.message = "Brand already exist";
            req.session.type = "error";
            return res.redirect("/admin/brand");
        }
        const newBrand = await new Brand({
            name,
            descrip
        });
        newBrand.save();
        req.session.message = "Successfully created Brand";
        req.session.type = "success";
        return res.redirect("/admin/brands")

    } catch (error) {
        console.log("server error", error);
        res.status(500).send("server error")
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
        return res.status(500).send("server error");
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

        const limit = 3;

        let brands = await Brand.find({
            name: { $regex: search, $options: "i" },
            is_delete: false
        }).sort({ created_at: -1 }).skip((page - 1) * limit).limit(limit);


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
        res.status(500).send("server error")
    }
}

const deleteBrand = async (req, res) => {
    try {
        const id = req.params.id;
        console.log("id: ", id);

        const brand = await Brand.findByIdAndUpdate(id, { is_delete: true }, { new: true });
        console.log("deleted category: ", brand);
        const brands = await Brand.find({ is_delete: false });
        console.log("remaining categories:", brands);

        if (!brand) {
            console.log("No brand found for id:", id);
            return res.status(404).json({ error: "Brand not found" });
        }
        else return res.json({ message: "Brand deleted successfully", brands });
    } catch (error) {
        console.log("server error", error);
        res.status(500).send("server error")
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
            return res.status(404).send("Brand not found");
        }

        return res.render("admin/editBrand", {
            message,
            type,
            brand,
            page
        });
    } catch (error) {
        console.log("server error", error);
        res.status(500).send("server error");
    }
}

const updateBrand = async (req, res) => {
    try {
        const { _id, name, descrip } = req.body;
        const page = parseInt(req.query.page);
        const existingBrand = await Brand.findById(_id);
        if (!existingBrand) {
            req.session.message = "No brand found with this ID";
            req.session.type = "error";
            return res.redirect("/admin/brands")
        }
        const upadateBrand = await Brand.findByIdAndUpdate(_id, { name, descrip });

        if (!upadateBrand) {
            req.session.message = "Brand not updated, Please try again.";
            req.session.type = "error";
            return res.redirect(`/admin/editBrand/${_id}`);

        }
        req.session.message = "Updated brand";
        req.session.type = "success";
        res.redirect(`/admin/brands/?page=${page}`);

    } catch (error) {
        console.log("server error", error);
        res.status(500).send("server error")
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
        res.status(500).send("server error")
    }
}


// //Product

const createProduct = async (req, res) => {
    try {
        console.log("get in to createProduct");

        let message = req.session.message || "";
        req.session.message = "";
        let type = req.session.type || "";
        req.session.type = "";
        let categories = await Category.find({ view: true });
        //console.log(categories);
        let brands = await Brand.find({ view: true });

        res.render("admin/addProduct", {
            message,
            type,
            categories,
            brands
        })
    } catch (error) {
        console.log("server error", error);
        res.status(500).send("server error")

    }
}


const saveProduct = async (req, res) => {
    console.log("get in to saveProduct");
    console.log(req.body);

    try {
        const { name, category, brand, descrip } = req.body;
        let variants = req.body.variants;

        variants = Array.isArray(variants) ? variants : [variants];
        req.files.forEach(file => {
            const index = parseInt(file.fieldname.match(/\d+/)[0], 10);

            if(!variants[index].images){
                variants[index].images = [];
            }
            variants[index].images.push(file.path);
        });
        //const imageUrls = req.files.map((file) => file.path)

        console.log("req.files: ", req.files);

        if (!name) {
            return res.json({ type: "error", message: "Please fill all the mandatory fields" });
        }

        const trimedName = name.trim();
        const existingProduct = await Product.findOne({ name: { $regex: `^${trimedName}$`, $options: "i" } });

        if (existingProduct) {
            return res.json({ type: "error", message: "Product name already exists. if you want to continue, please change product name" });
        }

        const newProduct = await new Product({
            name,
            cat_id: category,
            brand_id: brand,
            descrip,
            // images: imageUrls,
            variants
        });
        await newProduct.save();
        return res.json({
            success: true,
            type: "success",
            message: "Successfully created Product",
            product: newProduct
        });

    } catch (error) {
        console.log("server error", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
}

const checkProductName = async function (req, res) {
    try {
        const productName = req.params.productName;
        //const trimedproductName = productName.trim();
        const existingProduct = await Product.findOne({ name: { $regex: `^${productName}$`, $options: "i" } });
        if (existingProduct) {
            return res.json({ exists: true });
        }
        return res.json({ exists: false });
    } catch (error) {
        console.error(err);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}

const products = async function (req, res) {
    try {
        let message = req.session.message;
        req.session.message = "";
        let type = req.session.type;
        req.session.type = "";
        res.render("admin/products", { message, type });

    } catch (error) {
        console.log("server error", error);
        res.status(500).send("server error")
    }
}



module.exports = {
    loadLogin,
    login,

    // user
    loadCustomer,
    fetchUser,
    userDetails,
    updateUser,

    //category
    createCategory,
    saveCategory,
    categories,
    fetchCategories,
    deleteCategory,
    categoryDetails,
    updateCategory,
    viewCategory,

    //brand
    createBrand,
    saveBrand,
    brands,
    fetchBrands,
    deleteBrand,
    brandDetails,
    updateBrand,
    viewBrand,

    //product
    createProduct,
    saveProduct,
    //imageUpload,
    checkProductName,
    products

}
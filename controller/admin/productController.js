const mongoose = require("mongoose");
const Product = require("../../models/productModel");
const Category = require("../../models/categoryModel");
const Brand = require("../../models/brandModel")
const multer = require("multer");
const cloudinary = require("../../config/cloudinary");

function uploadToCloudinary(buffer, folder = "products") {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            { folder }, (err, result) => {
                if (err) reject(err);
                else resolve(result.secure_url);
            });
            stream.end(buffer);
    });
}

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
    console.log(req.files);
    
    try {
        const { name, category, brand, descrip } = req.body;

        req.files.forEach((file, i)=> {
           console.log(i, file.fieldname, file.originalname);
            
        });
        if (!name || !brand || !category) {
            return res.json({ type: "error", message: "Please fill all the mandatory fields" });
        }

        const trimedName = name.trim();
        const existingProduct = await Product.findOne({ 
            name: { $regex: `^${trimedName}$`, $options: "i" } 
        });

        if (existingProduct) {
            return res.json({ type: "error", message: "Product name already exists. if you want to continue, please change product name" });
        }

        let variants = req.body.variants;

        variants = Array.isArray(variants) ? variants : [variants];

        variants = variants.map(v => ({
        ...v,
        images: [],
        original_images: []
    }));

        for (const file of req.files) {
           const index = parseInt(file.fieldname.match(/\d+/)[0], 10);

            if (file.fieldname.includes("[images]")) {
            // Cropped image
            const url = await uploadToCloudinary(file.buffer, "product_images/cropped");
            variants[index].images.push(url); 
        }

        if (file.fieldname.includes("[original_images]")) {
            // Original image
            const url = await uploadToCloudinary(file.buffer, "product_images/original");
            variants[index].original_images.push(url);
        }
        };

        const newProduct = await new Product({
            name,
            cat_id: Array.isArray(category) ? category : [category],
            brand_id: brand,
            descrip,
            variants
        });
        console.log("new product about to save, ", newProduct);

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
        let page = req.query.page ? req.query.page : 1
        console.log("page number is ", page);

        let message = req.session.message;
        req.session.message = "";
        let type = req.session.type;
        req.session.type = "";
        res.render("admin/products", { message, type, page });

    } catch (error) {
        console.log("server error", error);
        res.status(500).send("server error")
    }
}

const fetchProducts = async (req, res) => {
    try {
        let search = "";
        if (req.query.search) {
            search = req.query.search;
        }

        let page = 1;
        if (req.query.page) {
            page = parseInt(req.query.page);
        }

        const limit = 2;
        const categories = await Category.find({ name: { $regex: search, $options: "i" } });
        const brands = await Brand.find({ name: { $regex: search, $options: "i" } });

        const categoryIds = categories.map(cat => cat._id);
        const brandIds = brands.map(brand => brand._id);

        const query = {
            $or: [
                { name: { $regex: search, $options: "i" } },
                { cat_id: { $in: categoryIds } },
                { brand_id: { $in: brandIds } }
            ],
            is_delete: false
        }
        let products = await Product.find(query)
            .populate("cat_id", "name")
            .populate("brand_id", "name")
            .sort({ created_at: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        console.log(JSON.stringify(products));

        let count = await Product.find(query)
            .countDocuments();

        console.log(count);

        totalPages = Math.ceil(count / limit);

        return res.json({
            products,
            totalPages,
            currentPage: page
        })
    } catch (error) {
        console.log("server error", error);
        res.status(500).send("server error");
    }
}

const viewProduct = async (req, res) => {
    try {
        const productId = req.params.id;
        const variantId = req.params.variantId;

        const product = await Product.findById(productId);

        if (!product) {
            res.status(400).json({ success: false, message: "Product not found" });
        }

        const variant = await product.variants.id(variantId);
        if (!variant) {
            return res.status(404).json({ success: false, message: "Variant not found" });
        }

        variant.view = !variant.view;
        console.log(product.variants.id(variantId));

        await product.save();
        res.json({ 
            success: true,
            variantId: variant._id,
            view: variant.view
         });

    } catch (error) {
        console.log("server error", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
}

const deleteProduct = async (req, res) => {
    try {
        console.log("GET IN THE DELETE FUNCTION");

        const id = req.params.id;
        console.log(id);

        const product = await Product.findByIdAndUpdate(id, { is_delete: true });
        console.log(product);

        if (!product) {
            console.log("No product found for id:", id);
            return res.status(404).json({ error: "Product not found" });
        }

        const products = await Product.find({ is_delete: false });
        return res.json({ message: "Product deleted successfully", products });
    } catch (error) {
        console.log("server error", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
}

const productDetails = async (req, res) => {
    try {
        const id = req.params.id;
        const page = req.query.page;
        let message = req.session.message || "";
        req.session.message = "";
        let type = req.session.type || "";
        req.session.type = "";
        const product = await Product.findById(id);
        let categories = await Category.find({ view: true });
        // console.log(categories);
        let brands = await Brand.find({ view: true });
        if (!product) {
            req.session.message = "Brand not found";
            return res.status(404).send("Brand not found");
        }
        console.log("product : ", product);
        
        return res.render("admin/editProduct", {
            product,
            page,
            categories,
            brands,
            message,
            type
        })
    } catch (error) {
        console.log("server error", error);
        res.status(500).send("server error");

    }
}

// const updateProduct = async (req, res) => {
//     try {
//         console.log("get in to update function");

//         const { _id, name, category, brand, descrip, removedImages } = req.body;

//         const product = await Product.findById(_id);
//         if (!product) {
//             return res.json({
//                 success: false,
//                 type: "failure",
//                 message: "No product found with this ID"
//             });
//         }

//         let variants = req.body.variants;
//         variants = Array.isArray(variants) ? variants : [variants];
//         //console.log("req.files: ", req.files);
//         req.files.forEach(file => {
//             const index = parseInt(file.fieldname.match(/\d+/)[0], 10);
//             console.log(index)
//             if (file.originalname.startsWith("cropped")) {
//                 if(!variants[index]){
//                     variants[index] = {};
//                 }
//                 if (!variants[index].images) {
//                     variants[index].images = [];
//                 }
//                 variants[index].images.push(file.path);
//             }
//         })

//         //const removedList = removedImages ? JSON.parse(removedImages) : [];

//         variants = variants.map((variant, index) => {
//             const existingvariant = product.variants[index];
//             const existingImages = existingvariant?.images || [];
//             const newImages = variant[index].images || [];

//             const filteredExisting = existingImages.filter(
//                 img => !removedList.includes(img)
//             );
//         })


//         if (product.variants.length === 0) {
//             return res.json({
//                 success: false,
//                 type: "failure",
//                 message: "Please add atleast one variant",
//             });
//         }

//         product.name = name;
//         product.cat_id = Array.isArray(category) ? category : [category];
//         product.brand_id = brand;
//         product.descrip = descrip;
//         product.variants = variants;

//         await product.save();
//         console.log("Product before save: ", product);

//         return res.json({
//             success: true,
//             type: "success",
//             message: "Product updated successfully",
//         });
//     } catch (error) {
//         console.log("server error", error);
//         res.status(500).send("server error");

//     }
// }

// const updateProduct = async (req, res) => {
//     try {
//         console.log("get in to update function");
//         console.log("req.body: ", req.body);

//         const { _id, name, category, brand, descrip } = req.body;


//         const product = await Product.findById(_id);
//         if (!product) {
//             return res.json({
//                 success: false,
//                 type: "failure",
//                 message: "No product found with this ID"
//             });
//         }

//         let variants = req.body.variants || [];

//         // Normalize if only one variant was sent (not array)
//         if (!Array.isArray(variants)) variants = [variants];

//         console.log("files:", req.files);
//         variants = variants.map((variant, index) => {
//             let existing = variant.existingImages;
//             if (typeof existing === 'string') {
//                 existing = JSON.parse(existing);
//             }
//             existing = Array.isArray(existing) ? existing : [existing];
//             variant.images = variant.existingImages;
//             console.log("variant.images: ", variant.images);

//             const newFiles = req.files.filter(file => file.fieldname === `variants[${index}][images][]`);
//             console.log("newFiles");

//             const newImageUrls = newFiles.map(file => file.path);

//             return {
//                 strap_color: variant.strap_color,
//                 dial_color: variant.dial_color,
//                 price: variant.price,
//                 stock: variant.stock,
//                 images: [...existing, ...newImageUrls]
//             }
//         })

//         if (product.variants.length === 0) {
//             return res.json({
//                 success: false,
//                 type: "failure",
//                 message: "Please add atleast one variant",
//             });
//         }

//         product.name = name;
//         product.cat_id = Array.isArray(category) ? category : [category];
//         product.brand_id = brand;
//         product.descrip = descrip;
//         product.variants = variants;

//         await product.save();
//         console.log("Product before save: ", product);

//         return res.json({
//             success: true,
//             type: "success",
//             message: "Product updated successfully",
//         });
//     } catch (error) {
//         console.log("server error", error);
//         res.status(500).send("server error");

//     }
// }

const updateProduct = async (req, res) => {
    try {
        console.log("get into update controller");

        console.log("req.body:", req.body);
        console.log("req.files:", req.files);

        const { _id, name, category, brand, descrip } = req.body;

        const product = await Product.findById(_id);
        if (!product) {
            return res.json({ success: false, message: "Product not found" });
        }

        let variants = req.body.variants || [];

        if (!Array.isArray(variants)) variants = [variants];

        const updatedVariants = variants.map((variant, index) => {

            let existing = variant.existingImages;
            if (typeof existing === "string") {
                existing = JSON.parse(existing);
            }
            existing = Array.isArray(existing) ? existing : [];

            const uploadedFiles = req.files.filter(
                (file) => file.fieldname.startsWith(`variants[${index}][images]`)
            );

            const newImageUrls = uploadedFiles.map(file => file.path);

            const finalImages = [...existing, ...newImageUrls];

            return {
                strap_color: variant.strap_color,
                dial_color: variant.dial_color,
                price: variant.price,
                stock: variant.stock,
                images: finalImages
            };
        });

        product.name = name;
        product.cat_id = Array.isArray(category) ? category : [category];
        product.brand_id = brand;
        product.descrip = descrip;
        product.variants = updatedVariants;

        await product.save();

        console.log("PRODUCT UPDATED ✅", product);

        return res.json({
            success: true,
            message: "Product updated successfully"
        });

    } catch (err) {
        console.error("Update Error:", err);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};


module.exports = {
    createProduct,
    saveProduct,
    checkProductName,
    products,
    fetchProducts,
    viewProduct,
    deleteProduct,
    productDetails,
    updateProduct
}
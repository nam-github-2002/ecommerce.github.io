const Product = require('../models/Product');
const ProductCategory = require('../models/ProductCategory');
const ErrorResponse = require('../utils/ErrorResponse');
const asyncHandler = require('express-async-handler');
const path = require('path');

// @desc    Get all products
// @route   GET /api/v1/products
// @access  Public
// Trong controllers/productController.js
exports.getProducts = async (req, res) => {
    try {
        // Lấy tham số từ query (phân trang, lọc, sắp xếp)
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 12;
        const skip = (page - 1) * limit;
        const keyword = req.query.keyword;

        // Xây dựng query
        let query = {};

        // Tìm kiếm theo keyword (tên hoặc mô tả)
        if (keyword) {
            query.$or = [
                { name: { $regex: keyword, $options: 'i' } },
                { description: { $regex: keyword, $options: 'i' } },
            ];
        }

        // Lọc theo danh mục
        if (req.query.category) {
            query.category = req.query.category;
        }

        // Lọc theo giá
        if (req.query.price) {
            const [min, max] = req.query.price.split('-');
            query.price = {};
            if (min) query.price.$gte = parseInt(min);
            if (max) query.price.$lte = parseInt(max);
        }

        // Sắp xếp
        let sort = { createdAt: -1 }; // Mặc định sắp xếp mới nhất
        if (req.query.sort) {
            if (req.query.sort === 'price') sort = { price: 1 };
            if (req.query.sort === '-price') sort = { price: -1 };
            if (req.query.sort === '-ratings') sort = { ratings: -1 };
        }

        // Thực hiện query
        const products = await Product.find(query)
            .sort(sort)
            .skip(skip)
            .limit(limit);

        const totalProducts = await Product.countDocuments(query);
        const totalPages = Math.ceil(totalProducts / limit);

        // Lấy danh sách categories để hiển thị trong filter
        const categories = await ProductCategory.find({})
            .select('name') // Thêm slug nếu có
            .sort({ name: 1 }); // Sắp xếp theo tên

        // Chuẩn bị dữ liệu pagination
        const pagination = {
            current: page,
            pages: totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1,
        };

        // Render view
        res.render('products/list', {
            title: 'Trang chủ - TechStore',
            products,
            categories,
            pagination,
            price: req.query.price,
            rating: req.query.rating,
            currentSort: req.query.sort,
            currentCategory: req.query.category,
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};
// @desc    Get single product
// @route   GET /api/v1/products/:id
// @access  Public
exports.getProduct = async (req, res, next) => {
    const product = await Product.findById(req.params.id);

    // Lấy header Authorization
    const authHeader = req.headers.authorization;

    let token = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
        // Tách token ra khỏi chuỗi "Bearer "
        token = authHeader.split(' ')[1];
    }

    // Render view
    res.render('products/detail', {
        title: product.name,
        product,
        token,
    });
};
// @desc    Create new product
// @route   POST /api/v1/products
// @access  Private/Admin
exports.createProduct = asyncHandler(async (req, res, next) => {
    // Add user to req.body
    req.body.user = req.user.id;

    const product = await Product.create(req.body);

    res.status(201).json({
        success: true,
        data: product,
    });
});

// @desc    Update product
// @route   PUT /api/v1/products/:id
// @access  Private/Admin
exports.updateProduct = asyncHandler(async (req, res, next) => {
    let product = await Product.findById(req.params.id);

    if (!product) {
        return next(
            new ErrorResponse(
                `Không tìm thấy sản phẩm với id ${req.params.id}`,
                404
            )
        );
    }

    // Make sure user is product owner or admin
    if (product.user.toString() !== req.user.id && req.user.role !== 'admin') {
        return next(
            new ErrorResponse(
                `User ${req.user.id} không có quyền cập nhật sản phẩm này`,
                401
            )
        );
    }

    product = await Product.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
    });

    res.status(200).json({
        success: true,
        data: product,
    });
});

// @desc    Delete product
// @route   DELETE /api/v1/products/:id
// @access  Private/Admin
exports.deleteProduct = asyncHandler(async (req, res, next) => {
    const product = await Product.findById(req.params.id);

    if (!product) {
        return next(
            new ErrorResponse(
                `Không tìm thấy sản phẩm với id ${req.params.id}`,
                404
            )
        );
    }

    // Make sure user is product owner or admin
    if (product.user.toString() !== req.user.id && req.user.role !== 'admin') {
        return next(
            new ErrorResponse(
                `User ${req.user.id} không có quyền xóa sản phẩm này`,
                401
            )
        );
    }

    await product.remove();

    res.status(200).json({
        success: true,
        data: {},
    });
});

// @desc    Upload photo for product
// @route   PUT /api/v1/products/:id/photo
// @access  Private
exports.uploadProductPhoto = asyncHandler(async (req, res, next) => {
    const product = await Product.findById(req.params.id);

    if (!product) {
        return next(
            new ErrorResponse(
                `Không tìm thấy sản phẩm với id ${req.params.id}`,
                404
            )
        );
    }

    if (!req.files) {
        return next(new ErrorResponse('Vui lòng tải lên một hình ảnh', 400));
    }

    const file = req.files.file;

    // Check if the file is an image
    if (!file.mimetype.startsWith('image')) {
        return next(new ErrorResponse('Vui lòng tải lên một file ảnh', 400));
    }

    // Check file size
    if (file.size > process.env.MAX_FILE_UPLOAD) {
        return next(
            new ErrorResponse(
                `Vui lòng tải lên ảnh có kích thước nhỏ hơn ${process.env.MAX_FILE_UPLOAD}`,
                400
            )
        );
    }

    // Create custom filename
    file.name = `photo_${product._id}${path.parse(file.name).ext}`;

    file.mv(`${process.env.FILE_UPLOAD_PATH}/${file.name}`, async (err) => {
        if (err) {
            console.error(err);
            return next(
                new ErrorResponse('Có lỗi xảy ra khi tải lên file', 500)
            );
        }

        await Product.findByIdAndUpdate(req.params.id, { photo: file.name });

        res.status(200).json({
            success: true,
            data: file.name,
        });
    });
});

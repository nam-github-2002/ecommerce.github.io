const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Vui lòng nhập tên sản phẩm'],
        trim: true,
        maxlength: [100, 'Tên sản phẩm không vượt quá 100 ký tự'],
    },
    price: {
        type: Number,
        required: [true, 'Vui lòng nhập giá sản phẩm'],
        maxlength: [10, 'Giá sản phẩm không vượt quá 10 chữ số'],
        default: 0.0,
    },
    description: {
        type: String,
        required: [true, 'Vui lòng nhập mô tả sản phẩm'],
    },
    ratings: {
        type: Number,
        default: 0,
    },
    images: [
        {
            public_id: {
                type: String,
                required: true,
            },
            url: {
                type: String,
                required: true,
            },
        },
    ],
    category: {
        type: String,
        required: [true, 'Vui lòng chọn danh mục sản phẩm'],
        enum: {
            values: [
                'Điện thoại',
                'Laptop',
                'Tablet',
                'Phụ kiện',
                'Đồng hồ',
                'Thiết bị âm thanh',
            ],
            message: 'Vui lòng chọn danh mục phù hợp',
        },
    },
    seller: {
        type: String,
        required: [true, 'Vui lòng nhập tên người bán'],
    },
    stock: {
        type: Number,
        required: [true, 'Vui lòng nhập số lượng sản phẩm'],
        maxlength: [5, 'Số lượng sản phẩm không vượt quá 5 chữ số'],
        default: 0,
    },
    numOfReviews: {
        type: Number,
        default: 0,
    },
    reviews: [
        {
            user: {
                type: mongoose.Schema.ObjectId,
                ref: 'User',
                required: true,
            },
            name: {
                type: String,
                required: true,
            },
            rating: {
                type: Number,
                required: true,
            },
            comment: {
                type: String,
                required: true,
            },
        },
    ],
    user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model('Product', productSchema);

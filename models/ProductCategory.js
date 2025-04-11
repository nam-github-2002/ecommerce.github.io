const mongoose = require('mongoose');

const ProductCategorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Vui lòng nhập tên danh mục'],
        unique: true,
        trim: true,
        maxlength: [50, 'Tên danh mục không vượt quá 50 ký tự'],
    },
    description: {
        type: String,
        maxlength: [500, 'Mô tả không vượt quá 500 ký tự'],
    },
    image: {
        type: String,
        default: 'no-photo.jpg',
    },
    parentCategory: {
        type: mongoose.Schema.ObjectId,
        ref: 'ProductCategory',
    },
    isFeatured: {
        type: Boolean,
        default: false,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

// Reverse populate with virtuals
ProductCategorySchema.virtual('products', {
    ref: 'Product',
    localField: '_id',
    foreignField: 'category',
    justOne: false,
});

module.exports = mongoose.model('ProductCategory', ProductCategorySchema);

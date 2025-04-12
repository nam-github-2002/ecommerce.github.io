const mongoose = require('mongoose');

const ProductCategorySchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Vui lòng nhập tên danh mục'],
            unique: true,
            trim: true,
            maxlength: [50, 'Tên danh mục không vượt quá 50 ký tự'],
        },
        slug: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },
        description: {
            type: String,
            maxlength: [500, 'Mô tả không vượt quá 500 ký tự'],
        },
        icon: {
            type: String,
            default: 'fa-question-circle', // Giá trị mặc định phù hợp hơn
        },
        parentCategory: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'ProductCategory',
            default: null,
        },
        isFeatured: {
            type: Boolean,
            default: false,
        },
        createdAt: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: false, // Tắt tự động thêm updatedAt (nếu không cần)
        toJSON: { virtuals: true }, // Bảo đảm virtuals hiển thị khi chuyển sang JSON
        toObject: { virtuals: true },
        id: false, // Tắt trường ảo _id
    }
);

// Virtual populate
ProductCategorySchema.virtual('products', {
    ref: 'Product',
    localField: '_id',
    foreignField: 'category',
    justOne: false,
});

// Tự động tạo slug khi save
ProductCategorySchema.pre('save', function (next) {
    if (!this.slug) {
        this.slug = this.name.toLowerCase().replace(/ /g, '-');
    }
    next();
});

module.exports = mongoose.model(
    'ProductCategory',
    ProductCategorySchema,
    'ProductCategory'
);

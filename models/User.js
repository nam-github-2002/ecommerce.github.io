const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Vui lòng nhập tên'],
        maxlength: [50, 'Tên không vượt quá 50 ký tự'],
    },
    email: {
        type: String,
        required: [true, 'Vui lòng nhập email'],
        unique: true,
        validate: [validator.isEmail, 'Vui lòng nhập email hợp lệ'],
    },
    password: {
        type: String,
        required: [true, 'Vui lòng nhập mật khẩu'],
        minlength: [6, 'Mật khẩu phải có ít nhất 6 ký tự'],
        select: false,
    },
    avatar: {
        public_id: {
            type: String,
            default: 'default_avatar',
        },
        url: {
            type: String,
            default: '/images/default-avatar.jpg',
        },
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user',
    },
    address: {
        addr: { type: String},
        city: { type: String},
        country: { type: String},
        postalCode: { type: String},
        phone: { type: String},
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

// Mã hóa mật khẩu trước khi lưu
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        next();
    }
    this.password = await bcrypt.hash(this.password, 10);
});

// Tạo JWT token
userSchema.methods.getJwtToken = function () {
    return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE,
    });
};

// So sánh mật khẩu
userSchema.methods.comparePassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);

const User = require('../models/User');
const asyncHandler = require('express-async-handler');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get current user profile
// @route   GET /api/v1/user/me
// @access  Private
exports.getUserProfile = asyncHandler(async (req, res, next) => {
    const user = await User.findById(req.user.id).select('-password');

    res.status(200).json({
        success: true,
        data: user,
    });
});

// @desc    Update user details
// @route   PUT /api/v1/user/updatedetails
// @access  Private
exports.updateUserDetails = asyncHandler(async (req, res, next) => {
    const fieldsToUpdate = {
        name: req.body.name,
        email: req.body.email,
    };

    const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
        new: true,
        runValidators: true,
    }).select('-password');

    res.status(200).json({
        success: true,
        data: user,
    });
});

// @desc    Update password
// @route   PUT /api/v1/user/updatepassword
// @access  Private
exports.updatePassword = asyncHandler(async (req, res, next) => {
    const user = await User.findById(req.user.id).select('+password');

    // Check current password
    if (!(await user.comparePassword(req.body.currentPassword))) {
        return next(new ErrorResponse('Mật khẩu hiện tại không đúng', 401));
    }

    user.password = req.body.newPassword;
    await user.save();

    sendTokenResponse(user, 200, res);
});

// @desc    Upload user avatar
// @route   PUT /api/v1/user/avatar
// @access  Private
exports.uploadAvatar = asyncHandler(async (req, res, next) => {
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
    file.name = `avatar_${req.user.id}${path.parse(file.name).ext}`;

    file.mv(`${process.env.FILE_UPLOAD_PATH}/${file.name}`, async (err) => {
        if (err) {
            console.error(err);
            return next(
                new ErrorResponse('Có lỗi xảy ra khi tải lên file', 500)
            );
        }

        await User.findByIdAndUpdate(req.user.id, { avatar: file.name });

        res.status(200).json({
            success: true,
            data: file.name,
        });
    });
});

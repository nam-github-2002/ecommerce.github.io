const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const {
    getProductsApi,
    getProducts,
    getProduct,
    createProduct,
    updateProduct,
    deleteProduct,
    createProductReview,
    getProductReviews,
    deleteReview,
} = require('../controllers/productController');

router.route('/').get(getProducts);
router.route('/:id').get(getProduct);
router
    .route('/:id/review')
    .get(protect, getProductReviews)
    .delete(protect, deleteReview)
    .post(protect, createProductReview)

module.exports = router;

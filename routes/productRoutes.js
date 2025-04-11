const express = require('express');
const router = express.Router();
const {
    getProductsApi,
    getProducts,
    getProduct,
    createProduct,
    updateProduct,
    deleteProduct,
} = require('../controllers/productController');


router.route('/').get(getProducts);
router.route('/:id').get(getProduct);
// router.route('/:id').get(getProduct).put(updateProduct).delete(deleteProduct);

module.exports = router;

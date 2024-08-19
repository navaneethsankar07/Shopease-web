var express = require('express');
var router = express.Router();
var productHelpers = require('../helpers/product-helpers');
var orderHelpers = require('../helpers/order-helpers');
const { ObjectId } = require('mongodb');
const { connect, getDB } = require('../config/connection'); // Import getDB from connection.js

// Middleware to check if admin is logged in
function checkAdminLogin(req, res, next) {
  if (req.session.adminLoggedIn) {
    next(); // If logged in, proceed to the next middleware/route handler
  } else {
    res.redirect('/admin/login'); // If not logged in, redirect to the login page
  }
}

// Login page route
router.get('/login', (req, res) => {
  res.render('admin/login'); // Render the admin login page
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;

  // Replace the following with your own admin authentication logic
  const adminEmail = 'admin@gmail.com';
  const adminPassword = 'admpass';

  if (email === adminEmail && password === adminPassword) {
    req.session.adminLoggedIn = true;
    res.redirect('/admin');
  } else {
    res.render('admin/login', { loginErr: 'Invalid email or password' });
  }
});

/* GET admin listing. */
router.get('/', checkAdminLogin, function (req, res, next) {
  productHelpers.getAllProducts().then((products) => {
    res.render('admin/view-products', { admin: true, products });
  });
});

router.get('/add-product', checkAdminLogin, function (req, res) {
  res.render('admin/add-product');
});

router.post('/add-product', (req, res) => {
  productHelpers.addProduct(req.body, (id) => {
      let image = req.files.image;
      image.mv('./public/product-images/' + id + '.jpg', (err) => {
          if (!err) {
              res.redirect('/admin');
          } else {
              console.error('Error saving image:', err);
              res.redirect('/admin/add-products');
          }
      });
  });
});

router.get('/delete-product/:id', checkAdminLogin, (req, res) => {
  let prodId = req.params.id;
  productHelpers.deleteProduct(prodId).then((response) => {
    res.redirect('/admin/');
  });
});

router.get('/edit-product/:id', checkAdminLogin, (req, res) => {
  let prodId = req.params.id;
  productHelpers.getProductDetails(prodId).then((product) => {
    res.render('admin/edit-product', { product });
  }).catch((err) => {
    console.error('Error fetching product details:', err);
    res.redirect('/admin');
  });
});

router.post('/edit-product/:id', checkAdminLogin, (req, res) => {
  let prodId = req.params.id;

  if (!ObjectId.isValid(prodId)) {
    return res.status(400).send('Invalid product ID');
  }

  productHelpers.updateProduct(prodId, req.body).then(() => {
    if (req.files && req.files.image) {
      let image = req.files.image;
      image.mv('./public/product-images/' + prodId + '.jpg', (err) => {
        if (err) {
          console.log(err);
        }
        res.redirect('/admin');
      });
    } else {
      res.redirect('/admin');
    }
  }).catch((err) => {
    console.error('Error updating product:', err);
    res.status(500).send('Internal Server Error');
  });
});

router.get('/orders', checkAdminLogin, (req, res) => {
  orderHelpers.getAllOrders().then((orders) => {
    res.render('admin/view-orders', { admin: true, orders });
  }).catch((err) => {
    console.error('Error fetching orders:', err);
    res.status(500).send('Internal Server Error');
  });
});

// Add this route to handle the approval of orders
router.post('/approve-order/:id', (req, res) => {
  let orderId = req.params.id;
  orderHelpers.approveOrder(orderId).then(() => {
    res.redirect('/admin/view-orders');
  }).catch((err) => {
    console.error('Error approving order:', err);
    res.status(500).send('Internal Server Error');
  });
});

// Route to fetch all users
router.get('/all-users', async (req, res) => {
  try {
    const db = getDB(); // Get the MongoDB database instance
    const usersCollection = db.collection('users'); // Replace 'users' with your actual collection name

    const users = await usersCollection.find({}, { projection: { username: 1, email: 1, dateJoined: 1 } }).toArray();
    
    res.render('admin/all-users', { users });
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).send('Error fetching users');
  }
});

module.exports = router;

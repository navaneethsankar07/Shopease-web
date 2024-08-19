const express = require('express');
const router = express.Router();
const productHelpers = require('../helpers/product-helpers');
const userHelpers = require('../helpers/user-helpers');
const { ObjectId } = require('mongodb');
const db = require('../config/connection');
const collection = require('../config/collections');



const verifyLogin = (req, res, next) => {
  if (req.session.user) {
    next();
  } else {
    res.redirect('/login');
  }
};
function calculateDeliveryDate(orderDate) {
  const orderDateObj = new Date(orderDate);
  if (!isNaN(orderDateObj)) {
    const deliveryDateObj = new Date(orderDateObj);
    deliveryDateObj.setDate(orderDateObj.getDate() + 14);
    return deliveryDateObj.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  } else {
    return 'Invalid Date';
  }
}


// Middleware to check if user is logged in
function checkAuth(req, res, next) {
  if (req.session.user) {
    res.redirect('/');
  } else {
    next();
  }
}

// Middleware to set cache control headers
function setNoCache(req, res, next) {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.set('Surrogate-Control', 'no-store');
  next();
}

// GET home page
router.get('/', async function (req, res, next) {
  let user = req.session.user;
  let cartCount = null;

  if (user) {
    cartCount = await userHelpers.getCartCount(user._id);
  }

  try {
    let userId = user ? user._id : null;
    let products = await userHelpers.getProductsWithWishlistFlag(userId);

    // Group products by category
    const groupedProducts = products.reduce((acc, product) => {
      const category = product.Category || 'Uncategorized';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(product);
      return acc;
    }, {});

    res.render('user/view-products', { groupedProducts, user, cartCount });
  } catch (err) {
    console.error('Error fetching products:', err);
    res.redirect('/');
  }
});
router.get('/product/:id', async (req, res) => {
  try {
    let productId = req.params.id;
    let product = await productHelpers.getProductDetails(productId);
    res.render('user/product-detail', { product, user: req.session.user });
  } catch (err) {
    console.error('Error fetching product details:', err);
    res.status(500).send('Internal Server Error');
  }
});
router.get('/search',setNoCache, async (req, res) => {
  let user = req.session.user;
  let cartCount = null;
  if (req.session.user) {
    cartCount = await userHelpers.getCartCount(req.session.user._id);
  }

  const searchQuery = req.query.query;
  productHelpers.searchProducts(searchQuery).then((products) => {
    const groupedProducts = products.reduce((acc, product) => {
      const category = product.Category || 'Uncategorized';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(product);
      return acc;
    }, {});
    
    res.render('user/view-products', { groupedProducts, user, cartCount, searchQuery });
  }).catch((err) => {
    res.status(500).send('Internal Server Error');
  });
});
// Apply the checkAuth middleware to signup and login routes
router.get('/signup', checkAuth, setNoCache, (req, res) => {
  res.render('user/signup');
});
router.get('/all-users', async (req, res) => {
  try {
    const users = await User.find({}, 'username email dateJoined'); // Adjust fields as per your schema
    res.render('admin/all-users', { users }); // Ensure 'admin/all-users' matches your actual file path
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).send('Error fetching users');
  }
});
router.post('/signup', checkAuth, setNoCache, (req, res) => {
  console.log('Signup request received');
  
  userHelpers.doSignup(req.body, (err, response) => {
    if (err) {
      console.error('Signup error:', err);
      return res.status(500).send('Signup failed');
    }

    console.log('Signup successful, user ID:', response);
    
    // Set session data
    req.session.user = {
      _id: response,
      loggedIn: true
    };

    // Redirect after setting the session
    res.redirect('/');
  });
});


router.get('/login', checkAuth, setNoCache, (req, res) => {
  res.render('user/login', { "loginErr": req.session.userloginErr });
  req.session.userloginErr = false;
});

router.post('/login', checkAuth, setNoCache, (req, res) => {
  userHelpers.doLogin(req.body).then((response) => {
    if (response.status) {
      
      req.session.user = response.user;
      req.session.user.loggedIn = true;
      res.redirect('/');
    } else {
      req.session.userloginErr = true;
      res.redirect('/login');
    }
  }).catch((err) => {
    res.status(500).send('Internal Server Error');
  });
});

router.get('/logout', (req, res) => {
  req.session.user=null
  res.redirect('/');
});

router.get('/cart', verifyLogin, async (req, res) => {
  try {
    let userId = req.session.user._id;
    let totalAmount = await userHelpers.getTotalAmount(userId);
      let products = await userHelpers.getCartProducts(userId);
   
      res.render('user/cart', { products, user: req.session.user ,totalAmount});
  } catch (err) {
      console.error('Error fetching cart products:', err);
      res.status(500).send('Internal Server Error');
  }
});

router.get('/add-to-cart/:id',  (req, res) => {
 
  userHelpers.addToCart(req.params.id, req.session.user._id).then(() => {
      res.json({status:true})
      console.log('Product added to cart');
  }).catch((err) => {
    res.json({status:false})
      console.error('Error in /add-to-cart route:', err);
      res.status(500).send('Internal Server Error');
  });
});

router.post('/change-product-quantity', (req, res, next) => {
  userHelpers.changeProductQuantity(req.body).then((response) => {
      res.json(response);
  }).catch((err) => {
      console.error('Error changing product quantity:', err);
      res.status(500).json({ status: false });
  });
});

router.post('/remove-from-cart', (req, res) => {
  userHelpers.removeFromCart(req.body)
      .then((response) => {
          res.json({ status: true });
      })
      .catch((err) => {
          console.error('Error removing product from cart:', err);
          res.status(500).json({ status: false });
      });
});

router.get('/get-total-amount', async (req, res) => {
  try {
      let userId = req.session.user._id;
      let totalAmount = await userHelpers.getTotalAmount(userId);
      res.json({ totalAmount });
  } catch (err) {
      console.error('Error fetching total amount:', err);
      res.status(500).send('Internal Server Error');
  }
});


// Add these routes in your user.js file

// Route to add a product to the wishlist
router.post('/add-to-wishlist/:id', verifyLogin, async (req, res) => {
  try {
    await userHelpers.addToWishlist(req.params.id, req.session.user._id);
    res.status(200).json({ status: true });
  } catch (err) {
    console.error('Error adding to wishlist:', err);
    res.status(500).json({ status: false });
  }
});
router.get('/wishlist', verifyLogin, async (req, res) => {
  try {
    let wishlistProducts = await userHelpers.getWishlistProducts(req.session.user._id);
    res.render('user/wishlist', { user: req.session.user, wishlistProducts });
  } catch (err) {
    console.error('Error rendering wishlist:', err);
    res.redirect('/');
  }
});
// Route to remove a product from the wishlist
router.post('/remove-from-wishlist/:id', verifyLogin, async (req, res) => {
  try {
    await userHelpers.removeFromWishlist(req.params.id, req.session.user._id);
    res.status(200).json({ status: true });
  } catch (err) {
    console.error('Error removing from wishlist:', err);
    res.status(500).json({ status: false });
  }
});


router.get('/delivery-details', verifyLogin, async (req, res) => {
  let userId = req.session.user._id;
  try {
      let totalAmount = await userHelpers.getTotalAmount(userId);
      res.render('user/delivery-details', { totalAmount,user:req.session.user });
  } catch (err) {
      console.error('Error getting total amount:', err);
      res.render('user/delivery-details', { totalAmount: 0 });
  }
});
router.get('/orders', verifyLogin, async (req, res) => {
  let userId = req.session.user._id;
  try {
      let orders = await userHelpers.getUserOrders(userId);
      res.render('user/orders', { orders, user: req.session.user });
  } catch (err) {
      console.error('Error fetching user orders:', err);
      res.render('user/orders', { orders: [], user: req.session.user });
  }
});

router.post('/submit-order', verifyLogin, async (req, res) => {
  let products = await userHelpers.getCartProductList(req.body.userId);
  let totalprice = await userHelpers.getTotalAmount(req.body.userId);

  userHelpers.placeOrder(req.body, products, totalprice).then(async (orderId) => {
      if (req.body['payment-method'] == 'cod') {
          res.json({ status: true });
      } else {
          
          res.json({ status: true});
      }
  }).catch((err) => {
      console.error('Error placing order:', err);
      res.status(500).json({ status: false });
  });
});


router.get('/view-order-products/:id', async (req, res) => {
  try {
    let orderId = req.params.id;
    let orderDetails = await userHelpers.getOrderProducts(orderId);
    
    // Log the orderDetails to debug
    console.log(orderDetails);

    // Assuming the order date is stored in orderDetails[0] if it exists
    let orderDate = orderDetails[0]?.date; 
    let deliveryDate = calculateDeliveryDate(orderDate);

    res.render('user/view-order-products', { products: orderDetails, orderId: orderId, deliveryDate: deliveryDate });
  } catch (err) {
    console.error('Error fetching order details:', err);
    res.status(500).send('Internal Server Error');
  }
});




// Route to cancel an order
router.post('/cancel-order/:id', async (req, res) => {
  let orderId = req.params.id;
  try {
    await db.getDB().collection(collection.ORDER_COLLECTION).deleteOne({ _id: new ObjectId(orderId) });
    res.json({ status: true });
  } catch (err) {
    console.error('Error cancelling order:', err);
    res.status(500).json({ status: false });
  }
});
router.get('/product-detail/:id', async (req, res) => {
  try {
    let productId = req.params.id;
    let product = await userHelpers.getProductDetails(productId);
    res.render('user/product-detail', { product });
  } catch (err) {
    console.error('Error fetching product details:', err);
    res.status(500).send('Internal Server Error');
  }
});

 

router.get('/submit-order', verifyLogin, (req, res) => {
  res.render('user/submit-order', { orderPlaced: true });
});
router.get('view-order-products/:id', verifyLogin,async(req,res)=>{
  let products=await userHelpers.getOrderProducts(req.params.id)
  res.render('user/view-order-products',{user:req.session.user,products})
})
router.post('/do-payment', verifyLogin, async (req, res) => {
  let orderId = req.body.orderId;
  // Here you can redirect the user to the payment page or perform any other action
  // For now, we will just update the status to 'Processing' as a placeholder
  userHelpers.updateOrderStatus(orderId, 'Processing').then(() => {
    res.redirect('/orders');
  }).catch((err) => {
    res.status(500).send('This is a sample project so we will update this site later');
  });
});
module.exports = router;

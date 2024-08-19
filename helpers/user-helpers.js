const db = require('../config/connection');
const collection = require('../config/collections');
const bcrypt = require('bcryptjs');
const { ObjectId } = require('mongodb');

module.exports = {
    doSignup: (userdata, callback) => {
        bcrypt.hash(userdata.Password, 10, (err, hash) => {
            if (err) {
                console.error('Error hashing password:', err);
                return callback(err);
            }
            userdata.Password = hash;
            db.getDB().collection(collection.USER_COLLECTION).insertOne(userdata, (err, result) => {
                if (err) {
                    console.error('Error inserting user:', err);
                    return callback(err);
                }
                callback(null, result.insertedId);
            });
        });
    },
    getProductDetails: (productId) => {
        return new Promise(async (resolve, reject) => {
          try {
            let product = await db.getDB().collection(collection.PRODUCT_COLLECTION).findOne({ _id: new ObjectId(productId) });
            resolve(product);
          } catch (err) {
            reject(err);
          }
        });
      },

    doLogin: (userdata) => {
        return new Promise(async (resolve, reject) => {
            let user = await db.getDB().collection(collection.USER_COLLECTION).findOne({ email: userdata.email });
            if (user) {
                bcrypt.compare(userdata.Password, user.Password).then((status) => {
                    if (status) {
                        resolve({ user, status: true });
                    } else {
                        resolve({ status: false });
                    }
                });
            } else {
                resolve({ status: false });
            }
        });
    },
    getProductsWithWishlistFlag: async (userId) => {
        let wishlist = await db.getDB().collection(collection.WISHLIST_COLLECTION).findOne({ user: new ObjectId(userId) });
        let wishlistProductIds = wishlist ? wishlist.products : [];
    
        let products = await db.getDB().collection(collection.PRODUCT_COLLECTION).aggregate([
          {
            $project: {
              _id: 1,
              Name: 1,
              Price: 1,
              Description: 1,
              Category: 1,
              inWishlist: { $in: ['$_id', wishlistProductIds] } // Add flag to indicate if product is in wishlist
            }
          }
        ]).toArray();
    
        return products;
      },
      addToWishlist: (productId, userId) => {
        return new Promise((resolve, reject) => {
            db.getDB().collection(collection.WISHLIST_COLLECTION).updateOne(
                { user: new ObjectId(userId) },
                { $addToSet: { products: new ObjectId(productId) } },
                { upsert: true }
            ).then((response) => {
                resolve(response);
            }).catch((err) => {
                reject(err);
            });
        });
    }, 
        getWishlistProducts: async (userId) => {
          let wishlist = await db.getDB().collection(collection.WISHLIST_COLLECTION).findOne({ user: new ObjectId(userId) });
          if (wishlist && wishlist.products.length > 0) {
            let products = await db.getDB().collection(collection.PRODUCT_COLLECTION).find({ _id: { $in: wishlist.products } }).toArray();
            return products;
          } else {
            return [];
          }
        },
    
      removeFromWishlist: async (productId, userId) => {
        await db.getDB().collection(collection.WISHLIST_COLLECTION).updateOne(
          { user: new ObjectId(userId) },
          { $pull: { products:new ObjectId(productId) } }
        );
      }
    ,
    addToCart: (proId, userId) => {
        let proObj = {
             item:new ObjectId(proId),
              quantity: 1 
            };
        return new Promise(async (resolve, reject) => {
            try {
                let userCart = await db.getDB().collection(collection.CART_COLLECTION).findOne({ user: new ObjectId(userId) });
                if (userCart) {
                    let proExist = userCart.products.findIndex(product => product.item == proId);
                    console.log(proExist);
                    if (proExist !== -1) {
                        db.getDB().collection(collection.CART_COLLECTION)
                            .updateOne({ user:new ObjectId(userId), 'products.item': new ObjectId(proId) }, { $inc: { 'products.$.quantity': 1 } })
                            .then(()=>{
                                resolve()
                            })
                            
                    } else{
                    db.getDB().collection(collection.CART_COLLECTION)
                        .updateOne(
                            { user: new ObjectId(userId) },
                            { $push: { products:proObj } }
                        ).then((response) => {
                            resolve();
                        }).catch((err) => {
                            reject(err);
                        });
                    }
                } else {
                    let cartObj = {
                        user: new ObjectId(userId),
                        products: [proObj]
                    };
                    db.getDB().collection(collection.CART_COLLECTION).insertOne(cartObj).then((response) => {
                        resolve();
                    }).catch((err) => {
                        reject(err);
                    });
                }
            } catch (err) {
                reject(err);
            }
        });
    },

    getCartProducts: (userId) => {
        return new Promise(async (resolve, reject) => {
            try {
                let cartItems = await db.getDB().collection(collection.CART_COLLECTION).aggregate([
                    { $match: { user: new ObjectId(userId) } },
                    {
                        $unwind:'$products'
                    },
                    {
                        $project:{
                            item:'$products.item',
                            quantity:'$products.quantity'
                        }
                    },
                    {
                        $lookup:{
                            from:collection.PRODUCT_COLLECTION,
                            localField:'item',
                            foreignField:'_id',
                            as:'product'
                        }
                    },
                    {
                        $project:{
                            item:1,quantity:1,product:{$arrayElemAt:['$product',0]}
                        }
                    }
                  
                ]).toArray();
                   
                 // Debugging output
    
                if (!cartItems.length) {
                    console.log("No cart items found for user:", userId);
                }
    
                resolve(cartItems);
            } catch (err) {
                console.error('Error in getCartProducts:', err);
                reject(err);
            }
        });
    }
,

    getCartCount: (userId) => {
        return new Promise(async (resolve, reject) => {
            let count = 0;
            let cart = await db.getDB().collection(collection.CART_COLLECTION).findOne({ user: new ObjectId(userId) });
            if (cart) {
                count = cart.products.length;
            }
            resolve(count);
        });
    },

    changeProductQuantity: (details) => {
        let count = parseInt(details.count);
        let cartId = new ObjectId(details.cart);
        let productId = new ObjectId(details.product);
        let quantity = parseInt(details.quantity);

        return new Promise((resolve, reject) => {
            if (count === -1 && quantity === 1) {
                db.getDB().collection(collection.CART_COLLECTION)
                    .updateOne(
                        { _id: cartId },
                        { $pull: { products: { item: productId } } }
                    )
                    .then((response) => {
                        resolve({ removeProduct: true });
                    })
                    .catch((err) => reject(err));
            } else {
                db.getDB().collection(collection.CART_COLLECTION)
                    .updateOne(
                        { _id: cartId, 'products.item': productId },
                        { $inc: { 'products.$.quantity': count } }
                    )
                    .then((response) => {
                        resolve({ status: true });
                    })
                    .catch((err) => reject(err));
            }
        });
    },

    removeFromCart: (details) => {
        return new Promise((resolve, reject) => {
            try {
                let cartId = new ObjectId(details.cart);
                let productId = new ObjectId(details.product);

                db.getDB().collection(collection.CART_COLLECTION)
                    .updateOne(
                        { _id: cartId },
                        { $pull: { products: { item: productId } } }
                    )
                    .then((response) => resolve({ status: true }))
                    .catch((err) => reject(err));
            } catch (err) {
                reject(err);
            }
        });
    }
,

getTotalAmount: (userId) => {
    return new Promise(async (resolve, reject) => {
        try {
            let total = await db.getDB().collection(collection.CART_COLLECTION).aggregate([
                { $match: { user: new ObjectId(userId) } },
                { $unwind: '$products' },
                { 
                    $lookup: { 
                        from: collection.PRODUCT_COLLECTION, 
                        localField: 'products.item', 
                        foreignField: '_id', 
                        as: 'productDetails' 
                    } 
                },
                { 
                    $project: { 
                        item: '$products.item', 
                        quantity: '$products.quantity', 
                        product: { $arrayElemAt: ['$productDetails', 0] } 
                    } 
                },
                {
                    $addFields: {
                        productPrice: {
                            $convert: {
                                input: { 
                                    $replaceAll: {
                                        input: "$product.Price",
                                        find: ",",
                                        replacement: ""
                                    }
                                },
                                to: "double",
                                onError: 0,
                                onNull: 0
                            }
                        }
                    }
                },
                { 
                    $group: { 
                        _id: null, 
                        total: { $sum: { $multiply: ['$quantity', '$productPrice'] } } 
                    } 
                }
            ]).toArray();
            resolve(total.length > 0 ? total[0].total : 0);
        } catch (err) {
            reject(err);
        }
    });
}
,

    placeOrder: (order, products, total) => {
        return new Promise((resolve, reject) => {
            let status = order['payment-method'] === 'cod' ? 'placed' : 'pending';
            let orderObj = {
                deliveryDetails: {
                    mobile: order.mobile,
                    address: order.address,
                    pincode: order.pincode
                },
                userId: new ObjectId(order.userId),
                paymentMethod: order['payment-method'],
                products: products,
                totalAmount: total,
                status: status,
                date: new Date()
            };

            db.getDB().collection(collection.ORDER_COLLECTION).insertOne(orderObj)
                .then((response) => {
                    if (response.insertedId) {
                        db.getDB().collection(collection.CART_COLLECTION).deleteOne({ user: new ObjectId(order.userId) })
                            .then(() => {
                                resolve(response.insertedId);
                            })
                            .catch((err) => {
                                console.error('Error deleting cart:', err);
                                reject(err);
                            });
                    } else {
                        reject(new Error('Failed to insert order'));
                    }
                })
                .catch((err) => {
                    console.error('Error placing order:', err);
                    reject(err);
                });
        })
    },

    getUserOrders: (userId) => {
        return new Promise(async (resolve, reject) => {
            try {
                let orders = await db.getDB().collection(collection.ORDER_COLLECTION).find({ userId: new ObjectId(userId) }).toArray();
                resolve(orders);
            } catch (err) {
                reject(err);
            }
        });
    },

    getCartProductList: (userId) => {
        return new Promise(async (resolve, reject) => {
            try {
                let cart = await db.getDB().collection(collection.CART_COLLECTION).findOne({ user: new ObjectId(userId) });
                if (cart) {
                    resolve(cart.products);
                } else {
                    resolve([]); // Return an empty array if the cart does not exist
                }
            } catch (err) {
                reject(err);
            }
        });
    },

    getOrderProducts: (orderId) => {
        return new Promise(async (resolve, reject) => {
            try {
                let orderItems = await db.getDB().collection(collection.ORDER_COLLECTION).aggregate([
                    { $match: { _id: new ObjectId(orderId) } },
                    { $unwind: '$products' },
                    {
                        $lookup: {
                            from: collection.PRODUCT_COLLECTION,
                            localField: 'products.item',
                            foreignField: '_id',
                            as: 'productDetails'
                        }
                    },
                    {
                        $project: {
                            item: '$products.item',
                            quantity: '$products.quantity',
                            product: { $arrayElemAt: ['$productDetails', 0] }
                        }
                    }
                ]).toArray();
                resolve(orderItems);
            } catch (err) {
                reject(err);
            }
        });
    },
    updateOrderStatus: (orderId, status) => {
        return new Promise((resolve, reject) => {
          db.getDB().collection(collection.ORDER_COLLECTION)
            .updateOne({ _id: new objectId(orderId) }, { $set: { status: status } })
            .then((response) => {
              resolve();
            })
            .catch((err) => {
              reject(err);
            });
        });
      },
     
    
};

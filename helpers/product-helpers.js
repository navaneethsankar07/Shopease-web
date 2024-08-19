const db = require('../config/connection');
const collection = require('../config/collections');
const { ObjectId } = require('mongodb');

module.exports = {
  addProduct: (product, callback) => {
    db.getDB().collection(collection.PRODUCT_COLLECTION).insertOne(product).then((data) => {
      callback(data.insertedId);
    }).catch((err) => {
      console.error('Error adding product:', err);
    });
  },
  getAllProducts: () => {
    return new Promise((resolve, reject) => {
      const dbInstance = db.getDB();
      if (!dbInstance) {
        return reject(new Error('Database connection is not established'));
      }
      dbInstance.collection(collection.PRODUCT_COLLECTION).find().toArray().then((products) => {
        resolve(products);
      }).catch((err) => {
        reject(err);
      });
    });
  },
  deleteProduct: (prodId) => {
    return new Promise((resolve, reject) => {
      const dbInstance = db.getDB();
      if (!dbInstance) {
        return reject(new Error('Database connection is not established'));
      }
      dbInstance.collection(collection.PRODUCT_COLLECTION).deleteOne({ _id: new ObjectId(prodId) }).then((response) => {
        resolve(response);
      }).catch((err) => {
        reject(err);
      });
    });
  },
  getProductDetails: (prodId) => {
    return new Promise((resolve, reject) => {
      const dbInstance = db.getDB();
      if (!dbInstance) {
        return reject(new Error('Database connection is not established'));
      }
      dbInstance.collection(collection.PRODUCT_COLLECTION).findOne({ _id: new ObjectId(prodId) }).then((product) => {
        resolve(product);
      }).catch((err) => {
        reject(err);
      });
    });
  },
  updateProduct: (prodId, productDetails) => {
    return new Promise((resolve, reject) => {
      const dbInstance = db.getDB();
      if (!dbInstance || !ObjectId.isValid(prodId)) {
        return reject(new Error('Invalid database connection or product ID'));
      }
      dbInstance.collection(collection.PRODUCT_COLLECTION).updateOne(
        { _id: new ObjectId(prodId) },
        {
          $set: {
            Name: productDetails.Name,
            Category: productDetails.Category,
            Price: productDetails.Price,
            Description: productDetails.Description
          }
        }
      ).then((response) => {
        resolve(response);
      }).catch((err) => {
        reject(err);
      });
    });
  }, searchProducts: (searchQuery) => {
    return new Promise((resolve, reject) => {
      const dbInstance = db.getDB();
      if (!dbInstance) {
        return reject(new Error('Database connection is not established'));
      }
      const query = { Name: { $regex: searchQuery, $options: 'i' } }; // Case-insensitive search
      dbInstance.collection(collection.PRODUCT_COLLECTION).find(query).toArray().then((products) => {
        resolve(products);
      }).catch((err) => {
        reject(err);
      });
    });
  }
};


var db = require('../config/connection');
const collection = require('../config/collections');
var ObjectId = require('mongodb').ObjectId;

module.exports = {
    getAllOrders: () => {
        return new Promise((resolve, reject) => {
          db.getDB().collection('order').find().toArray().then((orders) => {
            resolve(orders);
          }).catch((err) => {
            reject(err);
          });
        });
      },
      approveOrder: (orderId) => {
        return new Promise((resolve, reject) => {
          db.getDB().collection('order').updateOne(
            { _id:new ObjectId(orderId) },
            { $set: { status: 'Approved' } }
          ).then((response) => {
            resolve(response);
          }).catch((err) => {
            reject(err);
          });
        });
      }
};
const db = require('../config/connection.js');
const collections = require('../config/collections');
const bcrypt = require('bcrypt');
const { helpers } = require('handlebars');
const { response } = require('express');
const { ObjectId } = require('mongodb');
const { off } = require('../app.js');
const saltRounds = 10;
const Razorpay = require('razorpay');
const { resolve } = require('path');
var instance = new Razorpay({
    key_id: 'rzp_test_PLS7KfbB2Pwa5F'
    ,
    key_secret: 'fykDwagPqMeeIrrvf9vjmhaH'
    ,
});


module.exports = {
    add_user: (user_details) => {
        var user_exist = null;
        return new Promise(async (resolve, reject) => {
            var k = await db.get().collection(collections.user_collection).find({ Email: user_details.Email }).toArray()
            if (k.length > 0) {
                user_exist = true
                resolve(user_exist);

            }
            else {
                bcrypt.hash(user_details.Password, saltRounds).then(function (hash) {
                    user_details.Password = hash;
                    db.get().collection("user_details").insertOne(user_details, (err, response) => {
                        if (err) {
                            console.log(err)
                        }
                        else {
                            resolve(response)
                        }
                    })
                });

                // const hash = await bcrypt.hashSync(user_details.Password, saltRounds);
                // user_details.Password = hash
                // db.get().collection(collections.user_collection).insertOne(user_details, (err, response) => {
                //     if (err) {
                //         console.log(err)
                //     }
                //     else {
                //         resolve(response)
                //     }
                // })
            }

        })

    },
    verify_user: (data, session) => {
        return new Promise(async (resolve, reject) => {
            var E = await db.get().collection(collections.user_collection).find({ Email: data.Email }).toArray()
            var user = {}
            if (E.length > 0) {
                bcrypt.compare(data.Password, E[0].Password).then(function (result) {

                    if (result==true) {
                        user.login_status = true;
                        session.user = E[0];
                        // session.userSignedIn=true
                        resolve(user)
                    } else {
                        user.login_status = false
                        resolve(user)
                    }
                });
                // var password = bcrypt.compareSync(data.Password, E[0].Password);
                // if (password == true) {
                //     resolve('s')
                // }
                // else {
                //     resolve('wrong credentials')
                // }
            }

            else {
                user.login_status = false

                resolve(user)
            }



        })
    },
    // addToCart: function(userId,productId){
    //   return new Promise(async function(resolve,reject){
    //     let cart={
    //         userId:userId,
    //         productIds:[new ObjectId (productId)]
    //     }
    //     let k=await db.get().collection(collections.cart).find({userId:userId}).toArray()

    //     if(k.length>0){
    //         let query={userId:userId}
    //         update={
    //             $push:{
    //                 productIds:new ObjectId (productId)
    //             }
    //         }
    //         db.get().collection(collections.cart).updateOne(query,update,function(err,resp){
    //             if(!err){
    //                 resolve(resp)        
    //             }
    //         })
    //     }
    //     else{
    //         db.get().collection(collections.cart).insertOne(cart,function(err,data){
    //             if(!err){
    //                 resolve(data)
    //             }
    //         })
    //     }

    //   })
    // },

    addToCart: function (userId, productId) {

        return new Promise(async function (resolve, reject) {
            let cart = {
                userId: userId,
                productIds: [{ productId: new ObjectId(productId), quantity: 1 }]
            }
            let k = await db.get().collection(collections.cart).find({ userId: userId }).toArray()

            if (k.length > 0) {

                let c = await k[0].productIds.find(function (x) { return x.productId.toString() == productId })
                //   console.log(c)
                if (c) {
                    db.get().collection(collections.cart).updateOne({ "userId": userId, "productIds.productId": new ObjectId(productId) }, { $inc: { "productIds.$.quantity": 1 } }, function (err, resp) {
                        if (!err) {
                            resolve(resp)
                        }
                    })
                } else {
                    let query = { userId: userId }
                    update = {
                        $push: {
                            productIds: { productId: new ObjectId(productId), quantity: 1 }
                        }
                    }
                    db.get().collection(collections.cart).updateOne(query, update, function (err, resp) {
                        if (!err) {
                            resolve(resp)
                        }
                    })
                }

            }
            else {
                db.get().collection(collections.cart).insertOne(cart, function (err, data) {
                    if (!err) {
                        resolve(data)
                    }
                })
            }

        })
    },

    // getCart: function(user){
    //     return  new Promise(async(resolve,reject)=>{
    //         var k=await db.get().collection(collections.cart).find({userId:user}).toArray()
    //         let array= k[0].productIds
    //         let productArray=[]
    //         for(x in array){
    //             let i=await db.get().collection(collections.product_collection).find({_id:new ObjectId(array[x])}).toArray()
    //             productArray.push(i[0]) 
    //         }
    //         resolve(productArray)


    //     })



    // },
    getCart: function (user) {
        return new Promise(function (resolve, reject) {

            let pipeline = [{ $match: { "userId": user } }, { $unwind: "$productIds" }, { $project: { productIds: 1, _id: 0 } },
            {
                $lookup: {
                    from: collections.product_collection, localField: "productIds.productId", foreignField: "_id", as: "productDoc"
                }
            }, { $unwind: "$productDoc" },
            { $project: { "product": "$productDoc.product", "_id": "$productDoc._id", "Category": "$productDoc.Category", "Description": "$productDoc.Description", "Price": "$productDoc.Price", "quantity": "$productIds.quantity" } },


            ]
            db.get().collection(collections.cart).aggregate(pipeline).toArray(function (err, data) {
                resolve(data)

            })
        })
    },
    rfCart: function (user, pId) {
        return new Promise(async function (resolve, reject) {
            prObjId = await new ObjectId(pId)
            db.get().collection(collections.cart).updateOne({ "userId": user._id }, { $pull: { "productIds": { "productId": prObjId } } }, function (err, resp) {
                if (!err) {
                    resolve('removed')
                }
            })
        })

    },
    changeCartQuantity: function (user, data) {
        return new Promise(async function (resolve, reject) {
            if (data.quantity == 1 & data.value == -1) {
                prObjId = await new ObjectId(data.pId)
                db.get().collection(collections.cart).updateOne({ "userId": user }, { $pull: { "productIds": { "productId": prObjId } } }, function (err, resp) {
                    if (!err) {
                        resolve('productRemoved')
                    }
                })
            }
            else {
                let value = parseInt(data.value)

                prObjId = await new ObjectId(data.pId)
                db.get().collection(collections.cart).updateOne({ "userId": user, "productIds.productId": prObjId }, { $inc: { "productIds.$.quantity": value } }, function (err, resp) {
                    if (!err) {
                        let pipeline = [{ $match: { 'userId': user } }, { $unwind: '$productIds' }, { $project: { productIds: 1 } }, { $match: { 'productIds.productId': prObjId } }, { $project: { 'quantity': '$productIds.quantity', _id: 0 } }]


                        db.get().collection(collections.cart).aggregate(pipeline).toArray(function (err, data) {
                            resolve(data[0].quantity)

                        })
                    }
                })

            }
        })
    },
    cartCount: function (id) {
        return new Promise(async function (resolve, reject) {
            let cart = await db.get().collection(collections.cart).find({ "userId": id }).toArray()
            if (cart.length > 0) {
                resolve(cart[0].productIds.length)
            } else { resolve(0) }
        })
    },
    cartTotal: function (user) {
        return new Promise(function (resolve, reject) {

            let pipeline = [{ $match: { "userId": user } }, { $unwind: "$productIds" }, { $project: { productIds: 1, _id: 0 } },
            {
                $lookup: {
                    from: collections.product_collection, localField: "productIds.productId", foreignField: "_id", as: "productDoc"
                }
            }, { $unwind: "$productDoc" },
            { $project: { "product": "$productDoc.product", "_id": "$productDoc._id", "Category": "$productDoc.Category", "Description": "$productDoc.Description", "Price": "$productDoc.Price", "quantity": "$productIds.quantity" } },
            { $project: { quantity: 1, Price: 1, _id: 0 } }
            ]
            db.get().collection(collections.cart).aggregate(pipeline).toArray(function (err, data) {
                // resolve(data)
                // console.log(data)
                let TotalPrice = 0
                data.forEach((x) => {
                    x.total = x.Price * x.quantity
                    TotalPrice += x.total
                })


                // let l=data.length
                // for(i=0;i<l;i++){
                //     data[i].Price=parseInt(data[i].Price)
                // }
                resolve(TotalPrice)

            })
        })
    },
    placeOrder: (user, order_data, TotalPrice) => {
        return new Promise(async (res, rej) => {
            let products = await db.get().collection(collections.cart).find({ userId: user }).toArray()
            let status = order_data.payment_method === "COD" ? "placed" : "pending"
            orderObject = {
                user: user,
                date: new Date(),
                status: status,
                payment_method: order_data.payment_method,
                delivery_data:
                {
                    address: order_data.Address,
                    Pincode: order_data.Pincode,
                    contact: order_data.ContactNo
                },
                products: products[0].productIds,
                total: TotalPrice

            }
            db.get().collection(collections.order_collection).insertOne(orderObject).then((orderDocument) => {
                db.get().collection(collections.cart).deleteOne({ userId: user }, function (err, resp) {
                    if (!err) {
                        res(orderDocument.insertedId)
                    }

                })
            })



        })

    },
    orders: (user) => {
        return new Promise(async (resolve, reject) => {
            let orders = await db.get().collection(collections.order_collection).find({ user: user }).toArray()
            resolve(orders)
        })

    },
    getOrderedProducts: (user, id) => {
        objId = new ObjectId(id)
        return new Promise((resolve, reject) => {
            let pipeline = [{ $match: { "user": user, "_id": objId } }, { $unwind: "$products" }, { $project: { products: 1, _id: 0 } },
            {
                $lookup: {
                    from: collections.product_collection, localField: "products.productId", foreignField: "_id", as: "productDoc"
                }
            }, { $unwind: "$productDoc" },
            // {$project:{product: { $arrayElemAt: [ "$productDoc", 0 ] }}}

            { $project: { "product": "$productDoc.product", "_id": "$productDoc._id", "Category": "$productDoc.Category", "Description": "$productDoc.Description", "Price": "$productDoc.Price" } },


            ]
            db.get().collection(collections.order_collection).aggregate(pipeline).toArray(function (err, data) {
                data.forEach((x) => { x.id = x._id.toString() })
                resolve(data)
            })
        })
    },
    createRazorpayOrder: (ordId, TotalPrice) => {
        return new Promise((resolve, reject) => {
            let k = ordId.toString()
            var options = {
                amount: TotalPrice * 100,  // amount in the smallest currency unit
                currency: "INR",
                receipt: k
            };
            instance.orders.create(options, function (err, order) {
                if (!err) {
                    resolve(order)
                }
            });

        })

    },
    verify1: (data) => {
        return new Promise((resolve, reject) => {
            const crypto = require('crypto');
            const secret = 'fykDwagPqMeeIrrvf9vjmhaH';
            const hmacValue = crypto.createHmac('sha256', secret).update(data['response[razorpay_order_id]'] + "|" + data['response[razorpay_payment_id]']).digest('hex');
            if (hmacValue == data['response[razorpay_signature]']) {
                resolve()
            } else {
                reject()
            }
        })

    },
    changeOrderStatus: function (orderId) {
        return new Promise((resolve, reject) => {
            db.get().collection(collections.order_collection).updateOne({ _id:new ObjectId (orderId )}, { $set: { "status": "placed" } }, (err, o) => {
                if (!err) {
                    resolve({ order: "placed" })
                }
            }
            )
        })

    }
}

const db = require('../config/connection.js');
const collections = require('../config/collections');
const bcrypt = require('bcrypt');
const { ObjectId } = require('mongodb');
const { product_collection } = require('../config/collections');
const saltRounds = 10;
var path = require('path')

module.exports = {
    add_product: function (product, callback) {
        db.get().collection(collections.product_collection).insertOne(product, (err, response) => {

            if (err) {
                callback(err)
            }
            else {
                callback(response.insertedId.toString())
            }
        })
    },
    retrieve_products: () => {
        return new Promise((resolve, reject) => {
            db.get().collection(collections.product_collection).find({}).toArray((err, result) => {


                if (err) { console.log(err) }
                else {
                    var documents = result
                    var l = documents.length
                    for (i = 0; i < l; i++) {
                        var ID = documents[i]._id.toString()
                        documents[i].id = ID
                    }
                    resolve(documents)
                }

            })

        })

    },
    delete_product: (id) => {
        return new Promise(function (r, rej) {
            var objid = new ObjectId(id)
            var query = { _id: objid }
            console.log(query)
            db.get().collection(collections.product_collection).deleteOne(query, function (err, data) {
                if (!err)
                    r(data)
            })
        })
    },
    edit_product: (id) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collections.product_collection).find({ _id: new ObjectId(id) }).toArray(function (err, data) {
                if (!err) {
                    data[0].id = data[0]._id.toString()
                    resolve(data[0])
                }
            })
        })
    },
    update_product: function (data, f) {
        return new Promise(function (resolve, reject) {
            console.log(f)
            let query = { _id: new ObjectId(data.id) }
            let updated_data = {
                $set:
                {
                    product: data.product,
                    Category: data.Category,
                    Price: data.Price,
                    Description: data.Description
                }
            }
            if(f){
                f.image.mv(path.join(__dirname, "..", "public/product_images/" + data.id + ".jpg"), (err) => {
                    if (err) { console.log(err) }
                })
            }


            db.get().collection(product_collection).updateOne(query,updated_data,function(err,response){
                if(!err){
                    resolve(response)
                }
            })

          

        })
    }

}
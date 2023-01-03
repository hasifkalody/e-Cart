const collections = require('../config/collections')
const db = require('../config/connection')
const bcrypt = require('bcrypt');
const saltRounds = 10;

module.exports = {
    verifyAdmin: (data,session) => {
        let adminSigned=false
        return new Promise(async function (resolve,reject) {
            let adminExist = await db.get().collection(collections.admin_collection).find({ AdminId: data.AdminId }).toArray()
            if(adminExist.length>0){
                const hash=adminExist[0].Password
                bcrypt.compare(data.Password, hash).then(function(result) {
                    if(result==true){
                        adminSigned=true
                        session.admin=adminExist[0]
                        resolve(adminSigned)
                    }else{
                        resolve(adminSigned)
                    }
                });
            }else{
                resolve(adminSigned)
            }
        })
    },
    addAdmin: (data) => {
       var exist={admin_exist:undefined};
        return new Promise(async (resolve, reject) => {
            let adminExist = await db.get().collection(collections.admin_collection).find({ AdminId: data.AdminId }).toArray()
            if(adminExist.length>0){
                exist.admin_exist=true
                
                resolve(exist)
            }
            else{
                await bcrypt.hash(data.Password, saltRounds).then(function (hash) {
                    data.Password = hash
                });
                db.get().collection(collections.admin_collection).insertOne(data,(err,data)=>{
                    resolve(data)
                })
            }
        })
    }
}
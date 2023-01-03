const MongoClient = require('mongodb').MongoClient
var state=null
module.exports.connect=function(){
   const url='mongodb://localhost:27017'
   const dbname='shopping'
   MongoClient.connect(url,(err,data)=>{
    if(err){console.log(err)}
    else{console.log("connected2")}
    state=data.db(dbname)
   })
}

module.exports.get=function(){
   return state
}
const { response } = require('express');
var express = require('express');
const { Db } = require('mongodb');
const { rawListeners } = require('../app');
// const session = require('express-session');
var router = express.Router();
const helpers = require('../helpers/product_helpers')
const user_helpers = require('../helpers/user_helpers');
const { route } = require('./admin');
function verifyLoginSatus(req,res,next){
  if(req.session.user){
    next()
  }else{
    res.redirect('/login')
  }
}

/* GET users listing. */
router.get('/',async function (req, res, next) {
  var user_data = req.session.user
  var count=undefined
  if(user_data){
    count=await user_helpers.cartCount(user_data._id)
  }
  helpers.retrieve_products().then((retrieved_products) => {
    res.render('./user/user', { retrieved_products, user: true, user_data,count})
  })
});
router.get('/login', function (req, res) {
  // var pass=req.session.login_failed
  console.log(req.session)
  if (req.session.user) { res.redirect('/') } 
  else {
    res.render('./user/login', {pass:req.session.login_failed,user: true});
    req.session.login_failed=false
  }
  
});

router.post('/login', function (req, res,) {
  user_helpers.verify_user(req.body, req.session).then((user) => {
    if (user.login_status==true) { 
      if(req.session.cart){
        res.redirect('/cart');
        req.session.cart=false
      }else{
        res.redirect('/') 
      }
    }
    else { 
      req.session.login_failed=true
      res.redirect('/login') }
  })

});
router.get('/create_account', function (req, res,) {
  res.render('./user/signup.hbs', { user: true });
});
router.post('/user_details', function (req, res,) {
  user_helpers.add_user(req.body).then((user_exist) => {
    if (user_exist==true) {
      res.send("<h1>USER ALREADY EXIST</h1>")
    }
    else { res.redirect('/login') }
  })

});
router.get('/logout', (req, res) => {
  // delete req.session.user
  // delete req.session.cart
  // delete req.session.userSignedIn
  // delete req.session.login_failed
  // res.redirect('/login')
  req.session.destroy(function(err){
    console.log(req.session)
    res.redirect('/')
  })
  
});
// router.get('/cart', (req, res) => {
//   if(req.session.user){
//     user_helpers.getCart(req.session.user._id).then(function(productArray){
//       res.render('user/cart',{user:true,user_data:req.session.user,productArray})
//     })
    
//   }
//    else{ 
//      req.session.cart=true
//      res.redirect('/login')}
// })

router.get('/cart', (req, res) => {
  if(req.session.user){
    user_helpers.getCart(req.session.user._id).then(async function(Array){
      count=await user_helpers.cartCount(req.session.user._id)
      let TotalPrice=await user_helpers.cartTotal(req.session.user._id) 
      res.render('user/cart',{user:true,user_data:req.session.user,Array,count,TotalPrice})
    })
    
  }
   else{ 
     req.session.cart=true
     res.redirect('/login')}
});

router.get('/addToCart/:id', (req, res) => {
    user_helpers.addToCart(req.session.user._id,req.params.id).then(async(data)=>{
      count=await user_helpers.cartCount(req.session.user._id)
      // console.log(count)
      res.json({added:count})
    }) 
  
});


// router.get('/addToCart/:id', (req, res) => {
//   if (req.session.user){
//     user_helpers.addToCart(req.session.user._id,req.params.id).then((data)=>{
//       res.redirect('/')
//     }) 
//   }
//   else{
//     res.redirect('/login')
//   }
// });
router.get('/rfCart/:id',verifyLoginSatus,function(req,res){
  user_helpers.rfCart(req.session.user,req.params.id).then(async(response)=>{
    let TotalPrice=await user_helpers.cartTotal(req.session.user._id)
    count=await user_helpers.cartCount(req.session.user._id)
    res.json({TotalPrice:TotalPrice,count:count})
  })
})
// router.get('/cartQD/:id/:q',function(req,res){
//   if(req.params.q>1){
//     user_helpers.changeCartQuantity(req.session.user._id,req.params.id,-1).then((response)=>{
//       res.redirect('/cart')
//     })
//   }
 
// })
// router.get('/cartQI/:id',function(req,res){
//   user_helpers.changeCartQuantity(req.session.user._id,req.params.id,1).then((response)=>{
//     res.redirect('/cart')
//   })
// })
router.post('/cCartQ', function(req,res){
  user_helpers.changeCartQuantity(req.session.user._id,req.body).then(async(response)=>{
    let TotalPrice=await user_helpers.cartTotal(req.session.user._id) 
    count=await user_helpers.cartCount(req.session.user._id)
    res.json({response:response,TotalPrice:TotalPrice,count:count})
  })
})
router.get('/checkOut',async function(req,res){
 let count=await user_helpers.cartCount(req.session.user._id)
  let TotalPrice=await user_helpers.cartTotal(req.session.user._id) 
var user_data=req.session.user
  res.render('user/checkoutForm',{user:true,TotalPrice,count,user_data})
})
router.post('/checkOut',function(req,res){
 user_helpers.cartTotal(req.session.user._id).then( function(TotalPrice){
 user_helpers.placeOrder(req.session.user._id,req.body,TotalPrice).then((ordId)=>{
   if(req.body.payment_method==='COD'){
     res.json({status:"placed"})}
  else{
    user_helpers.createRazorpayOrder(ordId,TotalPrice).then((response)=>{
      res.json(response)
    })
  }
  })
})
 
})

router.get('/postOrder',(req,res)=>{
  res.render('user/postOrder',{user:true})
})
router.get('/orders',(req,res)=>{
  user_helpers.orders(req.session.user._id).then(async(ordersArray)=>{
   let count=await user_helpers.cartCount(req.session.user._id)
   var user_data = req.session.user
    res.render('user/orders',{user:true,ordersArray,count,user_data})
  })
});

router.get('/ordered',(req,res)=>{
  user_helpers.getOrderedProducts(req.session.user._id,req.query.id).then(async(retrieved_products)=>{
    let count=await user_helpers.cartCount(req.session.user._id)
   var user_data = req.session.user
    res.render('user/user',{retrieved_products,user:true,count,user_data})
  })
  
});

router.post('/f2',(req,res)=>{
 user_helpers.verify1(req.body).then(()=>{
  user_helpers.changeOrderStatus(req.body['order[receipt]']).then((response)=>{
    res.json(response)
  })
 }).catch(()=>{
  console.log("online order failed")
  res.json({"status":"online order failed"})

})
});
module.exports = router;


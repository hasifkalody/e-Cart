var express = require('express');
var router = express.Router();
const helpers = require('../helpers/product_helpers')
const adminHelpers=require('../helpers/adminHelpers')
var path = require('path');
function verify_admin_login(req,res,next){
if(req.session.admin){
  next()
}else{res.redirect('/admin')}
}

/* GET users listing. */

router.get('/', function (req, res) {
  res.render('admin/login')
});
router.get('/addAnAdmin',verify_admin_login, function (req, res) {
  res.render('admin/addAdmin')
});

router.get('/adminDash',verify_admin_login, function (req,res) {
  var admin_data=req.session.admin
  helpers.retrieve_products().then((retrieved_products) => {
    res.render('./admin/admin', { retrieved_products,admin_data});
  })
});


router.post('/addAnAdmin', function (req, res) {
  adminHelpers.addAdmin(req.body).then((response)=>{
    console.log(response)
    res.json(response)
  })
});

router.post('/verifyAdmin', function (req, res) {
  adminHelpers.verifyAdmin(req.body,req.session).then((response)=>{
    if(response==true){
      res.redirect('/admin/adminDash')
    }else{
      res.redirect('/admin')
    }
  })
});
router.get('/adminLogout', function (req, res,) {
 req.session.destroy(function(err){
   console.log(err)
   res.redirect('/admin')
 })
});

router.get('/add_product', function (req, res,) {
  res.render('./admin/add_form',{img_err:req.session.image_not_selected});
  req.session.image_not_selected=false
});
router.post('/pro_details', function (req, res) {
  if (req.files) {
    helpers.add_product(req.body, async (id) => {
      // req.files.image.mv("./public/product_images/"+id+".jpg",(err)=>{if (err){console.log(err)}})
      await req.files.image.mv(path.join(__dirname, "..", "public/product_images/" + id + ".jpg"), (err) => {
        if (err) { console.log(err) }
      });
      res.redirect("/admin")
    })
  }
  else {
    req.session.image_not_selected=true
    res.redirect('/admin/add_product')
  }
});
router.get('/delete/:id',function(req,res){
var id=req.params.id
helpers.delete_product(id).then((resolved)=>{
  res.redirect('/admin')
  })
});
router.get('/edit/:id',function(req,res){
  helpers.edit_product(req.params.id).then((product_data)=>{
    res.render('./admin/edit',{product_data})
  })
  
})
router.post('/edit',function(req,res){
  helpers.update_product(req.body,req.files).then((response)=>{
    res.redirect('/admin')
  })
  
})


module.exports = router;

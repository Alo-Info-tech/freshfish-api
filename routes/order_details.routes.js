var express = require('express');
var router = express.Router();
var bodyParser = require('body-parser');
const mongoose = require("mongoose");
router.use(bodyParser.urlencoded({ extended: false }));
router.use(bodyParser.json());
var order_detailsModel = require('./../models/order_detailsModel');
var counterMasterModel = require('./../models/counterModel');
const stockModel = require('../models/stockModel');
const product_cart_detailsModel = require("../models/product_cart_detailsModel");
const userdetailsModel = require('../models/userdetailsModel');
const transaction_logsModel = require("../models/transaction_logsModel");

var ObjectId = require('mongodb').ObjectID;

////////////////   Admin User ////////////////



router.post('/create', async function (req, res) {
  try {
    for(let item of req.body.order_details){
      let stock_params = {fish_combo_id: new mongoose.Types.ObjectId(item.fish_combo_id), store: new mongoose.Types.ObjectId(req.body.store), status: true, delete_status: false, soldout: false,  gross_weight: {$gte: item.gross_weight} };
      console.log(stock_params);
      let stock = await stockModel.findOne(stock_params);
      if(stock == null){
        return res.json({Status:"Fail", Message: req.body.product_name + " has less/no stock.", Code: 400}); 
      }
    }

    const counter = await counterMasterModel.findByIdAndUpdate({ _id: 'order_details' }, { $inc: { seq: 1 } });
    console.log("counter",counter);
    let order_id = "FF-" + new Date().toLocaleDateString("en-IN", { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(new RegExp("/", "g"), "") + "-" + counter.seq.toString().padStart(4, '0');
        // let order_id = "FF-01" ;

    order_detailsModel.create({
      user_id: req.body.user_id,
      vendor_id: req.body.vendor_id,
      store: req.body.store,
      order_id: order_id,
      order_details: req.body.order_details,
      order_item_count: req.body.order_details.length,
      order_booked_at: new Date(),
      //order_deliver_date: req.body.order_deliver_date,
      order_deliver_status: "Booked",
      order_final_amount: req.body.order_final_amount,
      payment_method: req.body.payment_method,
      payment_id: req.body.payment_id,
      shippingid: req.body.shippingid,
      shipping_address: req.body.shipping_address,
      device_type: req.body.device_type,
      slot_date: req.body.slot_date,
      slot_time: req.body.slot_time,
      logs: [
        {
          "status": "Booked",
          "datetime": new Date(new Date().setHours(new Date().getHours() + 5))
        },
        {
          "status": "Confirmed",
          "datetime": new Date(new Date().setHours(new Date().getHours() + 5))
        },
        {
          "status": "Delivered",
          "datetime": new Date(new Date().setHours(new Date().getHours() + 5))
        }
      ]
    },
      async function (err, order) {
        if (err) res.json({ Status: "Fail", Message: err.message, Code: 400 });
        else {
          for (let item of req.body.order_details) {
            console.log(item);
             var stock_values = await stockModel.find({fish_combo_id: new mongoose.Types.ObjectId(item.fish_combo_id),store: new mongoose.Types.ObjectId(item.store)});
             console.log(stock_values);
             let datas =  {
                gross_weight : (stock_values[0].gross_weight - (parseFloat(item.gross_weight))).toFixed(2)
             }
             console.log(datas.gross_weight);
             stockModel.findByIdAndUpdate(stock_values[0]._id, datas, {new: true}, function (err, UpdatedDetails) {
            if (err) return res.json({Status:"Failed",Message:"Internal Server Error", Data : {},Code:500});
             // res.json({Status:"Success",Message:"product categories screen  Updated", Data : UpdatedDetails ,Code:200});
            });



            // await stockModel.updateOne({ _id: new mongoose.Types.ObjectId(item.fish_combo_id), store: new mongoose.Types.ObjectId(item.store) }, { gross_weight: { $inc: - (parseFloat(item.gross_weight)) } });
          }
          var carts = await product_cart_detailsModel.find({ user_id: req.body.user_id, product_id: { $in: req.body.order_details.map(x => x.product_id) } });
          if (carts !== null) carts.forEach(async cart => { console.log("cart-id", cart._id); await product_cart_detailsModel.findByIdAndRemove(cart._id, (err, res) => { console.log(err); console.log(res); }) });

        //   const user = await userdetailsModel.findOne({_id: req.body.user_id });
        //   if(user!=null){
        //   const message = `Dear ${user.first_name+ " "+user.last_name}, Thank you for your order. Your Inv.# ${order_id}, Amt Rs.${req.body.order_final_amount}. -We Know How To Choose Fresh Fish`;
        //   await global.send_sms(user.user_phone, message,"1607100000000220475").then(response=>{
        //     console.log("order sms sent")
        //   }).catch(err=>{
        //     console.error(err,"sms not sent");
        //   });
        // }
          res.json({ Status: "Success", Message: "Order Added successfully", Data: order, Code: 200 });
        }
      });
  }
  catch (e) {
    console.log(e);
    res.json({ Status: "Failed", Message: "Internal Server Error", Data: {}, Code: 500 });
  }
});



router.post('/getorder_list', function (req, res) {
  order_detailsModel.find({ user_id: req.body.user_id, order_deliver_status: req.body.order_deliver_status }, function (err, StateList) {
    res.json({ Status: "Success", Message: "New Order List", Data: StateList, Code: 200 });
  });
});


router.post('/get_last_address_detail', function (req, res) {
  order_detailsModel.findOne({ user_id: req.body.user_id}, function (err, StateList) {
    console.log(StateList.shipping_address);
    res.json({ Status: "Success", Message: "Last order shipping address detail", Data: StateList.shipping_address, Code: 200 });
  }).sort({_id:-1});
});


router.get('/deletes', function (req, res) {
  order_detailsModel.remove({}, function (err, user) {
    if (err) return res.status(500).send("There was a problem deleting the user.");
    res.json({ Status: "Success", Message: " type Deleted", Data: {}, Code: 200 });
  });
});


router.post('/getlist_id', function (req, res) {
  order_detailsModel.find({ Person_id: req.body.Person_id }, function (err, StateList) {
    res.json({ Status: "Success", Message: " type List", Data: StateList, Code: 200 });
  });
});



router.get('/getlist', async function (req, res) {
  orders_filter_api(req.query, res);
});

router.post('/getlist', async function (req, res) {
  orders_filter_api(req.body, res);
});

async function orders_filter_api(params,res){
  
  console.log(params);


  let filter_params = { delete_status: false };
  if (params.userid && params.userid !== "") {
    filter_params.user_id = new mongoose.Types.ObjectId(params.userid);
  }
  /*else if(!params.id){
    return res.json({Status:"Failed",Message:"userid is mandatory", Code:400});
   }*/
let skip = 0, limit = 50, sort = { _id: -1 };
if (params.skip) {
  skip = params.skip;
}
if (params.limit) {
  limit = params.limit;
}
if (params.status) {
  filter_params.order_status = { $in: params.status.split(",") };
}
if (params.id) {
  filter_params._id = params.id;
}
if(params.start_date && params.end_date){
  filter_params.order_booked_at = {$gte: new Date(params.start_date), $lte: new Date(params.end_date+"T23:59:59") }; 
}
else if (params.start_date){
  filter_params.order_booked_at = {$gte: new Date(params.start_date) }; 
}
else if (params.end_date){
  filter_params.order_booked_at = {$lte: new Date(params.end_date+"T23:59:59") }; 
}
if(params.order_date){
  filter_params.order_booked_at = {$gte: new Date(params.order_date), $lte: new Date(params.order_date+"T23:59:59") }; 
}
if(params.order_id){
  filter_params.order_id = params.order_id;
}
if(params.store){
  filter_params.store =  params.store;
}
if(params.vendor_id){
  filter_params.vendor_id = params.vendor_id;
}
if(params.delivery_date){
  filter_params.slot_date = params.delivery_date;
}
if(params.delivery_slot){
  filter_params.slot_time = params.slot_time;
}
if(params.delivery_status){
  filter_params.order_deliver_status = params.delivery_status;
}
if(params.payment_method){
  filter_params.payment_method = params.payment_method;
}
let count = 0;
if (skip == 0) {
 count = await order_detailsModel.countDocuments({ params: filter_params });
}


console.log("asdfasdfasdfasdf",filter_params);

order_detailsModel.find(filter_params, { updatedAt: 0, __v: 0 }, { sort: sort, skip: skip, limit: limit }, function (err, list) {
  if (err) res.json({ Status: "Fail", Message: "Some internal error", Data: err.message, Code: 500 });
  if (params.id) {
    res.json({ Status: "Success", Message: " type Details", Data: list.length > 0 ? list[0] : {}, Count: count, Code: 200 });
  } else {

     console.log(list);

    if(params.phone){
      list = list.filter(x=>x.user_id.user_phone.match(new RegExp(params.phone,"gi")));
    }
    if(params.username){
      list = list.filter(x=>x.user_id.first_name.match(new RegExp(params.username,"gi")));
    }
    if(params.productname){
      list = list.filter(x=>x.order_detials.filter(x1=>x1.product_id.fish_combo_id.product_name.match(new RegExp(params.productname,"gi")).length>0));
    }
    if(params.store){
      list = list.filter(x=>x.store.name.match(new RegExp(params.store,"gi")));
    }
    if(params.agentname){
      list = list.filter(x=>x.vendor_id.user_name.match(new RegExp(params.agentname,"gi")));
    }

    res.json({ Status: "Success", Message: " type Details", Data: list, Count: count, Code: 200 });
  }
}).populate([{ path: "user_id", select: ["first_name", "middle_name", "last_name", "user_email", "user_phone", "user_address"] },{path: "store", select: ["name","phoneno","email","location","type","address","code"] },
{ path: "vendor_id", select: ["business_name", "code", "store"], populate: [{ path: "store", select: ["name", "phoneno", "email"] }] },
{ path: "order_details.product_id", select: ["fish_combo_id", "unit", "price_type", "min_net_weight", "max_net_weight", "gross_weight", "cost", "discount_amount", "cat_id", "thumbnail_image", "product_img"], populate: [{ path: "fish_combo_id", select: ["product_name"] }, { path: "cat_id", select: ["product_cate"] }] }, { path: "shippingid" }]);
}

router.post('/edit', function (req, res) {
  order_detailsModel.findByIdAndUpdate(req.body._id, req.body, { new: true }, function (err, UpdatedDetails) {
    if (err) return res.json({ Status: "Failed", Message: "Internal Server Error", Data: {}, Code: 500 });
    res.json({ Status: "Success", Message: " type Updated", Data: UpdatedDetails, Code: 200 });
  });
});

router.post('/delete', function (req, res) {
  let c = {
    delete_status: true
  }
  order_detailsModel.findByIdAndUpdate(req.body._id, c, { new: true }, function (err, UpdatedDetails) {
    if (err) return res.json({ Status: "Failed", Message: "Internal Server Error", Data: {}, Code: 500 });
    res.json({ Status: "Success", Message: "Location Deleted successfully", Data: UpdatedDetails, Code: 200 });
  });
});

//// DELETES A USER FROM THE DATABASE
router.post('/admin_delete', function (req, res) {
  order_detailsModel.findByIdAndRemove(req.body._id, function (err, user) {
    if (err) return res.json({ Status: "Failed", Message: "Internal Server Error", Data: {}, Code: 500 });
    res.json({ Status: "Success", Message: " type Deleted successfully", Data: {}, Code: 200 });
  });
});

router.post('/bulk_update', function (req, res) {
  order_detailsModel.updateMany({ _id: { $in: req.body.ids.map(x => new mongoose.Types.ObjectId(x)) } }, { order_status: req.body.order_status }, { new: true }, function (err, UpdatedDetails) {
    if (err) return res.json({ Status: "Failed", Message: "Internal Server Error", Data: {}, Code: 500 });
    res.json({ Status: "Success", Message: "Order Updated", Data: UpdatedDetails, Code: 200 });
  });
});

/////////////////////////////////

//////Payment & Call back funcation /////

router.post('/callbackurl',async function (req, res) {
    console.log("********",req.body);
    console.log("********9999******",req.params);
   try {
        transaction_logsModel.create({
            order_id: ""+req.body.ORDERID,
            currency: ""+req.body.CURRENCY,
            txnamount: ""+req.body.TXNAMOUNT,
            txtnid: ""+req.body.TXNID,
            status: ""+req.body.STATUS,
            respcode: ""+req.body.RESPCODE,
            respmsg: ""+req.body.RESPMSG
        }, function (err, info) {
            console.log(err);
             console.log("********transaction_logsModel***********",info);
            if (err) res.json({ Status: "Failed", Message: err.message, Code: 500 });
                var url = "https://weknowfreshfish.com/#/cart-page/"+""+req.body.ORDERID;
              //var  url = "http://localhost:4500/#/cart-page/"+""+req.body.ORDERID;
                res.write(
                  '<!DOCTYPE html><html lang="en"><body onload="window.location.href=' +
                    "'" +
                    url +
                    "'" +
                    '"><h1>Payment Success</h1></body></html>'
                );
                res.end();
        });
      }
      catch (ex) {
          console.log(ex);
          res.json({ Status: "Failed", Message: ex.message, Code: 500 });
      }
  });



function paytm_credentials() {
  return {
    "mid": "zlgxwg60312032385233",
    "mkey": "@i_MtbgfXZ5jx2ZP",
    "website": "DEFAULT",
    "channelid": "WEB",
    "industryid": "Retail"
  }
}

router.get("/paytm_credentials", function (req, res) {
  res.send(paytm_credentials());
})

router.post("/payment_initiate", async function (req, res) {

  req.body.amount = 1;
  try {
      const https = require('https');
      const PaytmChecksum = require('paytmchecksum');
      const { v4: uuidv4 } = require('uuid');
      let credentials = paytm_credentials();
      let orderid = uuidv4();
      let callbackurl = "https://securegw.paytm.in/theia/paytmCallback?ORDER_ID=" + orderid;
      var paytmParams = {};
      paytmParams.body = {
        "requestType": "Payment",
        "mid": credentials.mid,
        "websiteName": credentials.website,
        "orderId": orderid,
        "callbackUrl": callbackurl,
        "txnAmount": {
          "value": parseFloat(req.body.amount).toFixed(2).toString(),
          "currency": "INR",
        },
        "userInfo": {
          "custId": req.body.userid,
        },
      };


      console.log(paytmParams.body);
      /*
      * Generate checksum by parameters we have in body
      * Find your Merchant Key in your Paytm Dashboard at https://dashboard.paytm.com/next/apikeys 
      */
      PaytmChecksum.generateSignature(JSON.stringify(paytmParams.body), credentials.mkey).then(function (checksum) {

        console.log('checksum',checksum);

       paytmParams.head = {
         "signature": checksum
       };

 var post_data = JSON.stringify(paytmParams);

       var options = {

         /* for Staging */
         hostname: 'securegw.paytm.in',

         /* for Production */
         // hostname: 'securegw.paytm.in',

         port: 443,
         path: '/theia/api/v1/initiateTransaction?mid=' + credentials.mid + '&orderId=' + orderid,
         method: 'POST',
         headers: {
           'Content-Type': 'application/json',
           'Content-Length': post_data.length
         }
 };

 var response = "";
       var post_req = https.request(options, function (post_res) {
         post_res.on('data', function (chunk) {
           response += chunk;
         });

         post_res.on('end', function () {
           console.log(response);
           //console.log(typeof response);
           response = JSON.parse(response);
           let result = {
             mid: credentials.mid,
             orderid: orderid,
             txnToken: response.body.txnToken,
             amount: parseFloat(req.body.amount).toFixed(2).toString(),
             callbackurl: callbackurl,
             //environment: "staging"
           }
           console.log({ "Status": response.body.resultInfo.resultMsg, Data: result, Code: 200 });
             res.send({ "Status": response.body.resultInfo.resultMsg, Data: result, Code: 200 });
           });
   });
 
   post_req.write(post_data);
       });
   }
   catch (ex) {
     res.send({ "Status": "Failed", Message: ex.message, Code: 500 });
   }
 });
 
 
 
 router.post("/payment_initiate_one", async function (req, res) {
    req.body.amount = 1;
   try {
       const https = require('https');
       const PaytmChecksum = require('paytmchecksum');
       const { v4: uuidv4 } = require('uuid');
       let credentials = paytm_credentials();
       let orderid = uuidv4();
       let callbackurl = "https://weknowfreshfish.com/api/order_details/callbackurl";
       var paytmParams = {};
       paytmParams.body = {
         "requestType": "Payment",
         "mid" : credentials.mid,
         "websiteName": credentials.website,
         "orderId": orderid,
         "callbackUrl": callbackurl,
         "txnAmount": {
           "value": parseFloat(req.body.amount).toFixed(2).toString(),
           "currency": "INR",
         },
   "userInfo": {
           "custId": req.body.userid,
         },
       };
 
       console.log("*****777777***",paytmParams.body);
 
       /*
       * Generate checksum by parameters we have in body
       * Find your Merchant Key in your Paytm Dashboard at https://dashboard.paytm.com/next/apikeys 
       */
       PaytmChecksum.generateSignature(JSON.stringify(paytmParams.body), credentials.mkey).then(function (checksum) {
 
          console.log('checksum',checksum);
 
         paytmParams.head = {
           "signature": checksum
         };
 
    var post_data = JSON.stringify(paytmParams);
 
         var options = {
 
           /* for Staging */
           hostname: 'securegw.paytm.in',
 
           /* for Production */
           // hostname: 'securegw.paytm.in',
 
           port: 443,
           path: '/theia/api/v1/initiateTransaction?mid=' + credentials.mid + '&orderId=' + orderid,
           method: 'POST',
           headers: {
             'Content-Type': 'application/json',
             'Content-Length': post_data.length
           },
           body: paytmParams.body,
           head: paytmParams.head
   };
 
   var response = "";
         var post_req = https.request(options, function (post_res) {
           post_res.on('data', function (chunk) {
             response += chunk;
            });
            post_res.on('end', function () {
              console.log("**********",response);
              // console.log(typeof response);
              response = JSON.parse(response);
              console.log("*****Token Detail*****",response.body.txnToken);
              let result = {
                mid: credentials.mid,
                orderid: orderid,
                txnToken: response.body.txnToken,
                amount: parseFloat(req.body.amount).toFixed(2).toString(),
                callbackurl: callbackurl,
                //environment: "staging"
              }
              res.send({"Status": response.body, Data: result, Code: 200 });
            });
     });
  
     post_req.write(post_data);
        });
    }
    catch (ex) {
      res.send({ "Status": "Failed", Message: ex.message, Code: 500 });
    }
  });
  
  
  
  router.post("/payment_initiate_value2", async function (req, res) {
    try {
        const https = require('https');
        const PaytmChecksum = require('paytmchecksum');
        const { v4: uuidv4 } = require('uuid');
        let credentials = paytm_credentials();
        let orderid = uuidv4();
  var paytm = {
    MID: "zlgxwg60312032385233", // paytm provide
    WEBSITE: "WEBSTAGING", // paytm provide
    INDUSTRY_TYPE_ID: "Retail", // paytm provide
    CHANNEL_ID: "WEB", // paytm provide
    ORDER_ID: orderid, // unique id
    CUST_ID: req.body.CUST_ID, // customer id
    MOBILE_NO: req.body.MOBILE_NO, // customer mobile number
    EMAIL: req.body.EMAIL, // customer email
    TXN_AMOUNT: req.body.TXN_AMOUNT, // transaction amount
    CALLBACK_URL: req.body.CALLBACK_URL, // Call back URL that i want to redirect after payment fail or success
  }
        /*
        * Generate checksum by parameters we have in body
      * Find your Merchant Key in your Paytm Dashboard at https://dashboard.paytm.com/next/apikeys 
      */


        PaytmChecksum.generateSignature(JSON.stringify(paytm), credentials.mkey).then(function (checksum) {
          console.log('checksum',checksum);
          let checksums = {
           checksu : checksum,
           order_id : orderid,
           paytm : paytm
          }
          res.send({ "Status": 'checksum', Data: checksums, Code: 200 });
   
   
         });
     }
     catch (ex) {
       res.send({ "Status": "Failed", Message: ex.message, Code: 500 });
     }
   });
   
   
   
   router.post("/payment_initiate_value3", async function (req, res) {
     try {
         const https = require('https');
         const PaytmChecksum = require('paytmchecksum');
         const { v4: uuidv4 } = require('uuid');
         let credentials = paytm_credentials();
         let orderid = uuidv4();
   var paytmParams = {};
   paytmParams.body = {
       "mid"             : "zlgxwg60312032385233",
       "linkType"        : "GENERIC",
       "linkDescription" : "Test Payment",
       "linkName"        : "Test",
   };
   
   /*
   * Generate checksum by parameters we have in body
   * Find your Merchant Key in your Paytm Dashboard at https://dashboard.paytm.com/next/apikeys 
   */
   PaytmChecksum.generateSignature(JSON.stringify(paytmParams.body), "YOUR_MERCHANT_KEY").then(function(checksum){
   
       paytmParams.head = {
           "tokenType"   : "AES",
           "signature"   : checksum
       };
   
       var post_data = JSON.stringify(paytmParams);
       var options = {

        /* for Staging */
        hostname: 'securegw.paytm.in',

        /* for Production */
        // hostname: 'securegw.paytm.in',

        port: 443,
        path: '/link/create',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': post_data.length
        }
    };

    var response = "";
    var post_req = https.request(options, function(post_res) {
        post_res.on('data', function (chunk) {
            response += chunk;
        });

 	post_res.on('end', function(){
            console.log('Response: ', response);
        });
    });

    post_req.write(post_data);
    post_req.end();


  });
  }
  catch (ex) {
    res.send({ "Status": "Failed", Message: ex.message, Code: 500 });
  }
});

router.post("/payout", (req, res) =>{
  const credentials = paytm_credentials();
  const PaytmChecksum = require('./PaytmChecksum');

var paytmParams = {};

// paytmParams["subwalletGuid"]      = "28054249-XXXX-XXXX-af8f-fa163e429e83";
paytmParams["orderId"]            = "ORDERID_98765";
paytmParams["amount"]             = "1.00";
// paytmParams["beneficiaryPhoneNo"] = "7777777777";
// paytmParams["beneficiaryEmail"]   = "test@example.com";
// paytmParams["notifyMode"]         = ["SMS","EMAIL"];
paytmParams["comments"]           = "Your Comment Here";

var post_data = JSON.stringify(paytmParams);

/**
* Generate checksum by parameters we have in body
* Find your Merchant Key in your Paytm Dashboard at https://dashboard.paytm.com/next/apikeys 
*/
PaytmChecksum.generateSignature(post_data, credentials.mkey).then(function(checksum){

    var x_mid      = credentials.mid;
    var x_checksum = checksum;

    var options = {

        /* for Staging */
        hostname: 'staging-dashboard.paytm.com',

        /* for Production */
        // hostname: 'dashboard.paytm.com',

        path   : '/pls/api/v1/payout-link/create',
        port   : 443,
        method : 'POST',
        headers: {
            'Content-Type'  : 'application/json',
            'x-mid'         : x_mid,
            'x-checksum'    : x_checksum,
            'Content-Length': post_data.length
        }
    };

    var response = "";
    const https = require('https');
    var post_req = https.request(options, function(post_res) {
        post_res.on('data', function (chunk) {
            response += chunk;
        });

        post_res.on('end', function(){
            console.log('Response: ', response);
            res.end(response);
        });
    });

    post_req.write(post_data);
    post_req.end();
});
});

router.post("/payment-link", async (req, res) => {


    req.body.amount = 1;

    
  /*
  * import checksum generation utility
  * You can get this utility from https://developer.paytm.com/docs/checksum/
  */
  const PaytmChecksum = require('paytmchecksum');
  let credentials = paytm_credentials();
  
  var paytmParams = {};
  let dt = new Date();
  dt = new Date(dt.setHours(dt.getHours()+(5+1)));
  dt = new Date(dt.setMinutes(dt.getMinutes()+30));
  console.log(dt);
const date = require('date-and-time');
const now1  =  new Date(dt);
now1.setDate(now1.getDate() + 1);
const value1 = date.format(now1,'DD/MM/YYYY')



  const user = await userdetailsModel.findOne({_id:new mongoose.Types.ObjectId(req.body.userid)});


  console.log("user",user);
  paytmParams.body = {
      "mid"             : credentials.mid,
      "linkType"        : "INVOICE",
      "linkDescription" : "Order Payment",
      "linkName"        : "Order",
      "amount"          : parseFloat(req.body.amount),
      "invoiceId"       : new Date().getTime(),
      "expiryDate"      : value1,
      "sendSms"         : true,
      "sendEmail"       : true,
      "customerContact":{
        "customerName":user.first_name,
        "customerEmail":user.user_email,
        "customerMobile": user.user_phone,
      },
      "statusCallbackUrl":"https://weknowfreshfish.com/api/order_details/paytm_success_one",
      "redirectionUrlSuccess":"https://weknowfreshfish.com/api/order_details/paytm_success",
      "redirectionUrlFailure":"https://weknowfreshfish.com/api/order_details/paytm_fail"
  };

  console.log("*******************",paytmParams.body);
  
  /*
  * Generate checksum by parameters we have in body
  * Find your Merchant Key in your Paytm Dashboard at https://dashboard.paytm.com/next/apikeys 
  */
  PaytmChecksum.generateSignature(JSON.stringify(paytmParams.body), credentials.mkey).then(function(checksum){
  
      paytmParams.head = {
          "tokenType"   : "AES",
          "signature"   : checksum
      };
  
      var post_data = JSON.stringify(paytmParams);
  
      var options = {
  
          /* for Staging */
          hostname: 'securegw.paytm.in',
  
          /* for Production */
          // hostname: 'securegw.paytm.in',
  
          port: 443,
          path: '/link/create',
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
              'Content-Length': post_data.length
          }
      };
  
      var response = "";
      const https = require('https');
      var post_req = https.request(options, function(post_res) {
          post_res.on('data', function (chunk) {
              response += chunk;
          });
  
          post_res.on('end', function(){
              console.log('Response: ', response);
              var final_data = JSON.parse(response);
              res.json({ Status: "Success", Message: "Lin", Data: final_data, Code: 200 });
          });
      });
  
      post_req.write(post_data);
      post_req.end();
  });
});


  router.get('/paytm_success',async function (req, res) {
    console.log(req.body);
});



router.post('/callbackurl_link',async function (req, res) {
    console.log("********",req.body);
    console.log("********9999******",req.params);
   try {
        transaction_logsModel.create({
            order_id: ""+req.body.ORDERID,
            currency: ""+req.body.CURRENCY,
            txnamount: ""+req.body.TXNAMOUNT,
            txtnid: ""+req.body.TXNID,
            status: ""+req.body.STATUS,
            respcode: ""+req.body.RESPCODE,
            respmsg: ""+req.body.RESPMSG
        }, function (err, info) {
            console.log(err);
             console.log("********transaction_logsModel***********",info);
            if (err) res.json({ Status: "Failed", Message: err.message, Code: 500 });
                var url = "https://weknowfreshfish.com/#/cart-page/"+""+req.body.ORDERID;
              //var  url = "http://localhost:4500/#/cart-page/"+""+req.body.ORDERID;
                res.write(
                  '<!DOCTYPE html><html lang="en"><body onload="window.location.href=' +
                    "'" +
                    url +
                    "'" +
                    '"><h1>Payment Success</h1></body></html>'
                );
                res.end();
        });
      }
      catch (ex) {
          console.log(ex);
          res.json({ Status: "Failed", Message: ex.message, Code: 500 });
      }
  });




 router.get('/paytm_success_one',async function (req, res) {
      console.log(req.cookies);
});


router.get("/paytm_fail", (req, res)=>{
  // console.log(req.query);
    // console.log(req.cookies);
    // console.log(req.body);
     console.log(req.param);
     console.log(req.params);
     console.log(req.query);
     const url = require('url');
   const query = (url.parse(req.url, true)).query; // get query string data
   console.log(query);
        // console.log(req.app.response);
        // console.log(req.body);


});



///////////////////

module.exports = router;

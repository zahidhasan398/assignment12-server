const express=require("express");
const cors=require("cors");
const jwt=require("jsonwebtoken");
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_KEY);
const port= process.env.PORT || 5000;
const app=express();
//-----------------
app.use(cors());
//----------------
app.use(express.json());
//-------------mongo start----------

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASS}@cluster0.5bogflx.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection
    //-----------jwt verify-----------
    const verifyJwt=(req,res,next)=>{
      const authorization=req.headers.authorization;
      
      
      if(!authorization)
      {
        return res.status(402).json({error:true,message:"unauthorized"});
      }
      const token=authorization.split(" ")[1];
      jwt.verify(token,process.env.JWT_SECRET_KEY,(err,decoded)=>{
        if(err){
          return res.status(403).json({error:true,message:"unathurized from jwtverify"})
        }
        
        req.decoded = decoded;
         next();
      })
    }
    //-----------jwt verify-----------
    const instructorCollection= await client.db("sports").collection("instructor-info");
    const userInfoCollection= await client.db("sports").collection("user-info");
    const selectedCourseCollection=await client.db("sports").collection("selected-course");
    const paymentsCollection=await client.db("sports").collection("payment-hub");
    const ourClubCollection=await client.db("sports").collection("extraData");
    //----------jwt-----------------
    app.post("/jwt",(req,res)=>{
      const body=req.body;
      const token=jwt.sign(body,process.env.JWT_SECRET_KEY,{expiresIn:"2h"});
      res.json({token})
    })
    //----------jwt-----------------
    //----------verify Admin----------
    const verifyAdmin=async(req,res,next)=>{
      const email=req.decoded.email;
      const query={email:email};
      if(!email){
         return res.json({error:true,message:"sorry i cant give you data"});
      }
      const exist=await userInfoCollection.findOne(query);
      if(!exist){
         return res.json({error:true,message:"sorry i cant give you data"});
      }
      else if(exist.role !== "admin"){
        return res.json({error:true,message:"sorry i cant give you data"});
      }
      else{
        next()
      }
    }
    //----------verify Admin----------
    //----------verify instructor--------
    const verifyInstructor=async(req,res,next)=>{
      const email=req.decoded.email;
      const query={email:email};
      if(!email){
         return res.json({error:true,message:"sorry i cant give you data"});
      }
      const exist=await userInfoCollection.findOne(query);
      if(!exist){
         return res.json({error:true,message:"sorry i cant give you data"});
      }
      else if(exist.role !== "instructor"){
        return res.json({error:true,message:"sorry i cant give you data"});
      }
      else{
        next()
      }
    }

    //----------verify instructor--------
    //----------verify student-----------
    const verifyStudent=async(req,res,next)=>{
      const email=req.decoded.email;
      const query={email:email};
      if(!email){
         return res.json({error:true,message:"sorry i cant give you data"});
      }
      const exist=await userInfoCollection.findOne(query);
      if(!exist){
         return res.json({error:true,message:"sorry i cant give you data"});
      }
      else if(exist.role !== "student"){
        return res.json({error:true,message:"sorry i cant give you data"});
      }
      else{
        next()
      }
    }
    //----------verify student-----------
    app.post("/instruct-info",verifyJwt,verifyInstructor,async(req,res)=>{
        const {instructorInfo}=req.body;
        const result=await instructorCollection.insertOne(instructorInfo);
        res.json(result);
    })
    app.get("/instruct-info/:email",verifyJwt,verifyInstructor,async(req,res)=>{
        const query={InstructorEmail : req.params.email}
        const result=await instructorCollection.find(query).toArray();
        res.json(result);
    })
    app.get("/all-instruct",verifyJwt,verifyAdmin,async(req,res)=>{
        const result=await instructorCollection.find().toArray();
        res.json(result);
    })
    app.patch("/instruct-info/:id",async(req,res)=>{
        const id=req.params.id;
        const {instructorInfo}=req.body;
        const query={_id : new ObjectId(id)};
        const updateDoc={
            $set:{
                ...instructorInfo
            }
        }
        const result=await instructorCollection.updateOne(query,updateDoc);
        res.json(result);
    })
    app.get("/updateinfo/:id",async(req,res)=>{
        const id=req.params.id;
        const query={_id: new ObjectId(id)};
        const result=await instructorCollection.findOne(query);
        res.json(result);
    })
    app.patch("/update/approve/:id",verifyJwt,verifyAdmin,async(req,res)=>{
      const query={_id: new ObjectId(req.params.id)};
      const updateDoc={
        $set:{
          status:"approve",
          isDisable:true
        }
      }
      const result=await instructorCollection.updateOne(query,updateDoc);
      res.json(result);
    })
    app.patch("/update/deny/:id",verifyJwt,verifyAdmin,async(req,res)=>{
      const query={_id: new ObjectId(req.params.id)};
      const updateDoc={
        $set:{
          status:"deny",
          isDisable:true
        }
      }
      const result=await instructorCollection.updateOne(query,updateDoc);
      res.json(result);
    })
    app.patch("/feedback/update/:id",verifyJwt,verifyAdmin,async(req,res)=>{
      const query={_id: new ObjectId(req.params.id)};
      const {feedback}=req.body;
      const updateDoc={
        $set:{
          feedback:feedback
        }
      }
      const result=await instructorCollection.updateOne(query,updateDoc);
      res.json(result);
    })
    app.post("/user/role",async(req,res)=>{
      const {userInfo}=req.body;
      const useremail=req.query.email;
      const query= {email:useremail};
      const exist=await userInfoCollection.findOne(query);
      if(exist || !useremail)
      {
        return
      }
      const result=await userInfoCollection.insertOne(userInfo);
      res.json(result); 
    })
    app.get("/user/role",verifyJwt,verifyAdmin,async(req,res)=>{
      const result= await userInfoCollection.find().toArray();
      res.json(result);
    })
    app.patch("/update/admin/:id",verifyJwt,verifyAdmin,async(req,res)=>{
      const query={_id: new ObjectId(req.params.id)};
      const updateDoc={
        $set:{
          role:"admin",
          isDisable:true
        }
      }
      const result=await userInfoCollection.updateOne(query,updateDoc);
      res.json(result);
    })
    app.patch("/update/instruct/:id",verifyJwt,verifyAdmin,async(req,res)=>{
      const query={_id: new ObjectId(req.params.id)};
      const updateDoc={
        $set:{
          role:"instructor",
          isDisable:true
        }
      }
      const result=await userInfoCollection.updateOne(query,updateDoc);
      res.json(result);
    })
    app.get("/only-instruct",async(req,res)=>{
      const query={role:"instructor"};
      const result=await userInfoCollection.find(query).toArray();
      res.json(result);
    })
    app.get("/approved-class",async(req,res)=>{
         const query={status:"approve"};
         const result=await instructorCollection.find(query).toArray();
         res.json(result);
    })
    app.post("/selected-course/:id",async(req,res)=>{
        const {selectedCourse}=req.body;
        const query={courseId: req.params.id};
        const exist=await selectedCourseCollection.findOne(query);
        if(exist){
          return res.json({exist:true});
        }
        const result=await selectedCourseCollection.insertOne(selectedCourse);
        res.json(result);
    })
    app.get("/selected-course/:email",verifyJwt,verifyStudent,async(req,res)=>{
      const query={studentEmail:req.params.email};
      const result=await selectedCourseCollection.find(query).toArray();
      res.json(result);
    })
    app.delete("/delete/selected-course/:id",verifyJwt,verifyStudent,async(req,res)=>{
      const  query={_id: new ObjectId(req.params.id)};
      const result=await selectedCourseCollection.deleteOne(query);
      res.json(result);
    })
    //--------------stripe payment-------------
    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;
      
      const amount=Number(price.toFixed(2))*100;
      
      // Create a PaymentIntent with the order amount and currency
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types:["card"]
      });
    
      res.json({
        clientSecret: paymentIntent.client_secret,
      });
    });
    //--------------stripe payment-------------
    app.post("/payment",async(req,res)=>{
      const body=req.body;
      const result= await paymentsCollection.insertOne(body);
      const query={_id: new ObjectId(body.paidcourseId) }
      const deleteResult=await selectedCourseCollection.deleteOne(query);
      //-----------update abailable seats--------
        
        const findHaveToUpadteQuery={_id: new ObjectId(body.instructId)}
        const findHaveToUpadteData=await instructorCollection.findOne(findHaveToUpadteQuery);
        const updateDoc={
          $set:{
            enroll:Number(findHaveToUpadteData?.enroll || 0)+1,
            available: Number(body.seats)-((findHaveToUpadteData?.enroll+1) || 1)
          }
        }
       if((findHaveToUpadteData?.enroll || 0) <= findHaveToUpadteData?.seats){
        const updateResult= await instructorCollection.updateOne(findHaveToUpadteQuery,updateDoc)
       }
      //-----------update abailable seats--------
      res.status(200).json({result,deleteResult}); 
    })
    app.get("/enroll-class/:email",verifyJwt,verifyStudent,async(req,res)=>{
      const query={studentEmail:req.params.email};
      const result=await paymentsCollection.find(query).toArray();
      res.json(result);
    })
    app.patch("/not-vacant/update/:id",async(req,res)=>{
      const query={_id: new ObjectId(req.params.id)};
      const updateDoc={
        $set:{
          notVacant:true
        }
      }
      const result=await instructorCollection.updateOne(query,updateDoc);
      res.json(result);
    })
    //----check role--------
    app.get("/user/role/admin",verifyJwt,verifyAdmin,async(req,res)=>{
      
       res.json({role:"admin"})
    })
    app.get("/user/role/instructor",verifyJwt,verifyInstructor,async(req,res)=>{
      res.json({role:"instructor"})
   })
   app.get("/user/role/student",verifyJwt,verifyStudent,async(req,res)=>{
    res.json({role:"student"})
 })
 app.get("/our-club",async(req,res)=>{
  const result= await ourClubCollection.find().toArray();
  res.json(result);
 })
 app.get("/desending/top-six-class",async(req,res)=>{
 const result= await instructorCollection.find().sort({enroll:-1}).toArray();
 res.json(result);

 })
    //----check role--------

    // await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

//-------------mongo end------------
app.listen(port,()=>{
    console.log(`server is running at ${port}`);
})
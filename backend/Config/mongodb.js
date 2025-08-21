import mongoose from "mongoose";
import { DB_NAME } from "./Db.name.js";


const connectDB = async () => {
   try {
    const conectionDB =  await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)

    console.log(`mongodb connected !! DB host:${conectionDB.connection.host}`);

   } catch (error) {
           console.error("Error connecting to MongoDB:", error);
        process.exit(1);
   }
}

export default connectDB
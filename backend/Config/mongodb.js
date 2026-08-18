import mongoose from "mongoose";
import { DB_NAME } from "./Db.name.js";


const connectDB = async () => {
   try {
    const baseUri = process.env.MONGODB_URI.endsWith('/') 
      ? process.env.MONGODB_URI 
      : process.env.MONGODB_URI + '/';
    const conectionDB = await mongoose.connect(`${baseUri}${DB_NAME}`)

    console.log(`mongodb connected !! DB host:${conectionDB.connection.host}`);

   } catch (error) {
           console.error("Error connecting to MongoDB:", error);
        process.exit(1);
   }
}

export default connectDB
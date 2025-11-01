import { NextResponse } from "next/server";
import connectDB from "../../../lib/mongodb";

export async function GET(request) {
  try {
    console.log("🔄 Attempting to connect to MongoDB...");
    
    await connectDB();
    
    console.log("✅ MongoDB connected successfully!");
    
    return NextResponse.json({
      success: true,
      message: "MongoDB connected successfully!",
      connectionString: process.env.MONGODB_URI?.replace(/\/\/.*@/, '//***:***@') || process.env.MONGODB_URI
    });
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
    
    return NextResponse.json({
      success: false,
      message: "MongoDB connection failed",
      error: error.message,
      hint: "Make sure MongoDB is installed and running on mongodb://127.0.0.1:27017"
    }, { status: 500 });
  }
}

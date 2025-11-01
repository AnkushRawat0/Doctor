import { NextResponse } from "next/server";
import { connectDB } from "../../../../lib/mongodb";
import Doctor from "../../../../models/Doctor";
import Admin from "../../../../models/Admin";
import jwt from "jsonwebtoken";

export async function GET(request) {
  try {
    await connectDB();

    //get token from header
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.substring(7)
      : request.headers.get("token");

    //validate token
    if (!token) {
      return NextResponse.json(
        { error: "Authentication token is required" },
        { status: 401 }
      );
    }
    // Verify JWT token
    let decoded;
    try {
      decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "doctar_jwt_secret_key_2025"
      );
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }
    // Check if user role is admin
    if (decoded.role !== "admin") {
      return NextResponse.json(
        { error: "Access denied. Admin privileges required." },
        { status: 403 }
      );
    }

    // Verify admin exists in database
    const admin = await Admin.findById(decoded.userId);

    if (!admin) {
      return NextResponse.json({ error: "Admin not found" }, { status: 404 });
    }

    // Check if admin account is active
    if (!admin.isActive) {
      return NextResponse.json(
        { error: "Admin account is deactivated" },
        { status: 403 }
      );
    }

    //get query parameters for pagination and filtering
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get("page")) || 1;
    const limit = parseInt(url.searchParams.get("limit")) || 10;
    const search = url.searchParams.get("search") || "";
    const specialization = url.searchParams.get("specialization") || "";
    const isActive = url.searchParams.get("isActive");
    const isVerified = url.searchParams.get("isVerified");

    // Build query object
    const query = {};

    // Add search  functionality
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { specialization: { $regex: search, $options: "i" } },
      ];
    }

    // Add specialization filter
    if (specialization) {
      query.specialization = { $regex: specialization, $options: "i" };
    }

    // Add active status filter
    if (isActive !== null && isActive !== undefined) {
      query.isActive = isActive === "true";
    }

    // Add verification status filter
    if (isVerified !== null && isVerified !== undefined) {
      query.isEmailVerified = isVerified === "true";
    }

    // Calculate skip value for pagination
    const skip = (page - 1) * limit;

    // Fetch doctors with pagination
    const doctors = await Doctor.find(query)
      .select("-password") // Exclude password field
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Get total count for pagination
    const totalDoctors = await Doctor.countDocuments(query);
    const totalPages = Math.ceil(totalDoctors / limit);

    // Return doctors data
    return NextResponse.json({
      success: true,
      message: "Doctors fetched successfully",
      data: {
        doctors,
        pagination: {
          currentPage: page,
          totalPages,
          totalDoctors,
          limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
        filters: {
          search,
          specialization,
          isActive,
          isVerified,
        },
      },
    });
  } catch (error) {
    console.error("Fetch doctors error:", error);
    return NextResponse.json(
      { error: "Failed to fetch doctors. Please try again." },
      { status: 500 }
    );
  }
}

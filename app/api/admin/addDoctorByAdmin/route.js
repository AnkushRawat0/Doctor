import { NextResponse } from "next/server";
import connectDB from "../../../../lib/mongodb";
import Doctor from "../../../../models/Doctor";
import Admin from "../../../../models/Admin";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export async function POST(request) {
  try {
    // Connect to database
    try {
      await connectDB();
    } catch (dbError) {
      console.error("Database connection failed:", dbError);
      if (process.env.NODE_ENV === "development") {
        console.log("Continuing in development mode without database...");
      } else {
        throw dbError;
      }
    }

    // Get token from headers
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.substring(7)
      : request.headers.get("token");

    // Validate token
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
    try {
      const admin = await Admin.findById(decoded.userId);
      if (!admin) {
        return NextResponse.json({ error: "Admin not found" }, { status: 404 });
      }
    } catch (dbError) {
      if (process.env.NODE_ENV !== "development") {
        throw dbError;
      }
    }

    // Get doctor data from request
    const {
      // Basic Information
      firstName,
      lastName,
      email,
      phone,
      password,
      dateOfBirth,
      gender,

      // Professional Information
      specialization,
      qualification,
      experience,
      awards,
      pastExperiences,
      bio,
      licenseNumber,

      // Practice Information
      clinicName,
      clinicAddress,
      clinicCoordinates,
      consultationFee,
      services,
      location,
      language,

      // Availability
      weeklyAvailability,
    } = await request.json();

    // Validate required fields
    if (!firstName || !lastName || !email || !phone || !password) {
      return NextResponse.json(
        {
          error:
            "Basic information is required (firstName, lastName, email, phone, password)",
        },
        { status: 400 }
      );
    }

    if (!specialization || !qualification || experience === undefined) {
      return NextResponse.json(
        {
          error:
            "Professional information is required (specialization, qualification, experience)",
        },
        { status: 400 }
      );
    }

    if (!clinicName || !clinicAddress || !consultationFee || !location) {
      return NextResponse.json(
        {
          error:
            "Practice information is required (clinicName, clinicAddress, consultationFee, location)",
        },
        { status: 400 }
      );
    }

    if (!dateOfBirth || !gender) {
      return NextResponse.json(
        { error: "Personal details are required (dateOfBirth, gender)" },
        { status: 400 }
      );
    }

    // Check if doctor already exists
    let existingDoctor;
    try {
      existingDoctor = await Doctor.findOne({
        $or: [
          { email: email.toLowerCase() },
          { phone: phone },
          ...(licenseNumber ? [{ licenseNumber: licenseNumber }] : []),
        ],
      });
    } catch (dbError) {
      if (process.env.NODE_ENV === "development") {
        console.log("Database query failed, continuing in development mode...");
        existingDoctor = null;
      } else {
        throw dbError;
      }
    }

    if (existingDoctor) {
      return NextResponse.json(
        {
          error:
            "Doctor with this email, phone, or license number already exists",
        },
        { status: 409 }
      );
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create doctor data (Admin-created doctors are automatically verified and active)
    const doctorData = {
      // Basic Information
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      password: hashedPassword,
      dateOfBirth: new Date(dateOfBirth),
      gender: gender,

      // Professional Information
      specialization: specialization.trim(),
      qualification: qualification.trim(),
      experience: parseInt(experience),
      awards: awards || [],
      pastExperiences: pastExperiences || [],
      bio: bio ? bio.trim() : "",
      licenseNumber: licenseNumber ? licenseNumber.trim() : null,

      // Practice Information
      clinicName: clinicName.trim(),
      clinicAddress: clinicAddress.trim(),
      clinicCoordinates: clinicCoordinates || {
        latitude: null,
        longitude: null,
      },
      consultationFee: parseFloat(consultationFee),
      services: services || [],
      location: location.trim(),
      language: language || "English",

      // Availability
      weeklyAvailability: weeklyAvailability || {
        monday: {
          available: true,
          timeSlots: [{ startTime: "09:00 AM", endTime: "05:00 PM" }],
        },
        tuesday: {
          available: true,
          timeSlots: [{ startTime: "09:00 AM", endTime: "05:00 PM" }],
        },
        wednesday: {
          available: true,
          timeSlots: [{ startTime: "09:00 AM", endTime: "05:00 PM" }],
        },
        thursday: {
          available: true,
          timeSlots: [{ startTime: "09:00 AM", endTime: "05:00 PM" }],
        },
        friday: {
          available: true,
          timeSlots: [{ startTime: "09:00 AM", endTime: "05:00 PM" }],
        },
        saturday: {
          available: true,
          timeSlots: [{ startTime: "09:00 AM", endTime: "02:00 PM" }],
        },
        sunday: { available: false, timeSlots: [] },
      },

      // Admin-created doctors are automatically verified and active
      isPhoneVerified: true,
      isEmailVerified: true,
      isActive: true,
      isSuspended: false,

      // Track that this doctor was created by admin
      createdBy: "admin",
      createdByAdmin: decoded.userId,
    };

    let savedDoctor;
    try {
      // Create new doctor
      const doctor = new Doctor(doctorData);

      // Save to database
      savedDoctor = await doctor.save();
      console.log("Doctor created by admin successfully:", savedDoctor._id);
    } catch (dbError) {
      if (process.env.NODE_ENV === "development") {
        console.log(
          "Database save failed, creating mock doctor for development"
        );
        // Create mock doctor for development
        savedDoctor = {
          _id: "mock_doctor_id_" + Date.now(),
          ...doctorData,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      } else {
        console.error("Database save error:", dbError);
        return NextResponse.json(
          { error: "Failed to create doctor in database" },
          { status: 500 }
        );
      }
    }

    // Return doctor data (without password)
    const doctorResponse = {
      id: savedDoctor._id,
      // Basic Information
      firstName: savedDoctor.firstName,
      lastName: savedDoctor.lastName,
      email: savedDoctor.email,
      phone: savedDoctor.phone,
      dateOfBirth: savedDoctor.dateOfBirth,
      gender: savedDoctor.gender,

      // Professional Information
      specialization: savedDoctor.specialization,
      qualification: savedDoctor.qualification,
      experience: savedDoctor.experience,
      awards: savedDoctor.awards,
      pastExperiences: savedDoctor.pastExperiences,
      bio: savedDoctor.bio,
      licenseNumber: savedDoctor.licenseNumber,

      // Practice Information
      clinicName: savedDoctor.clinicName,
      clinicAddress: savedDoctor.clinicAddress,
      clinicCoordinates: savedDoctor.clinicCoordinates,
      consultationFee: savedDoctor.consultationFee,
      services: savedDoctor.services,
      location: savedDoctor.location,
      language: savedDoctor.language,

      // Availability
      weeklyAvailability: savedDoctor.weeklyAvailability,

      // Status
      isPhoneVerified: savedDoctor.isPhoneVerified,
      isEmailVerified: savedDoctor.isEmailVerified,
      isActive: savedDoctor.isActive,
      isSuspended: savedDoctor.isSuspended,
      createdBy: savedDoctor.createdBy,
      createdAt: savedDoctor.createdAt,
    };

    return NextResponse.json(
      {
        success: true,
        message: "Doctor created successfully by admin",
        doctor: doctorResponse,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Admin add doctor error:", error);

    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return NextResponse.json(
        { error: `Doctor with this ${field} already exists` },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create doctor" },
      { status: 500 }
    );
  }
}

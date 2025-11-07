import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Question from '@/models/Question';
import Admin from '@/models/Admin';
import jwt from 'jsonwebtoken';

const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'doctar_jwt_secret_key_2025');
  } catch {
    return null;
  }
};

export async function GET(request) {
  try {
    await connectDB();

    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
    if (!token) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    if (decoded.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 });

    const admin = await Admin.findById(decoded.userId);
    if (!admin) return NextResponse.json({ error: 'Admin not found' }, { status: 404 });

    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const specialist = url.searchParams.get('specialist');
    const page = parseInt(url.searchParams.get('page')) || 1;
    const limit = parseInt(url.searchParams.get('limit')) || 10;
    const skip = (page - 1) * limit;

    const query = {};
    if (status) query.status = status;
    if (specialist) query.specialist = specialist;

    const [items, total] = await Promise.all([
      Question.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Question.countDocuments(query)
    ]);

    return NextResponse.json({
      success: true,
      data: items,
      pagination: { page, limit, total }
    });
  } catch (err) {
    console.error('Admin list questions error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

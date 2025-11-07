import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Question from '@/models/Question';
import Patient from '@/models/Patient';
import jwt from 'jsonwebtoken';

const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'doctar_jwt_secret_key_2025');
  } catch {
    return null;
  }
};

export async function POST(request) {
  try {
    await connectDB();

    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    // Allow both patient and doctor to ask? Requirement says only logged in user; we’ll accept any authenticated role
    const userId = decoded.userId;
    const role = decoded.role;

    // Load user email/name from Patient if role is patient; otherwise use decoded email/name if present
    let name = '';
    let email = '';

    if (role === 'patient') {
      const patient = await Patient.findById(userId);
      if (!patient) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      name = `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || 'User';
      email = patient.email || '';
    } else {
      // For now, require patient; can expand later
      return NextResponse.json({ error: 'Only patients can ask questions' }, { status: 403 });
    }

    const body = await request.json();
    const { specialist, question } = body || {};

    if (!specialist || !question || !question.trim()) {
      return NextResponse.json({ error: 'Specialist and question are required' }, { status: 400 });
    }

    if (question.length > 2000) {
      return NextResponse.json({ error: 'Question is too long (max 2000 chars)' }, { status: 400 });
    }

    const doc = await Question.create({
      userId,
      name,
      email,
      specialist: String(specialist).trim(),
      question: String(question).trim(),
      status: 'open'
    });

    return NextResponse.json({ success: true, question: { id: doc._id } }, { status: 201 });
  } catch (err) {
    console.error('Error creating question:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

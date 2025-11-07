import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Question from '@/models/Question';
import Admin from '@/models/Admin';
import jwt from 'jsonwebtoken';
import { sendQuestionReplyEmail } from '@/app/services/emailService';

const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'doctar_jwt_secret_key_2025');
  } catch {
    return null;
  }
};

export async function PATCH(request, { params }) {
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

    const { id } = params;
    const { reply, status } = await request.json();
    if (!reply || !reply.trim()) {
      return NextResponse.json({ error: 'Reply is required' }, { status: 400 });
    }

    const question = await Question.findById(id);
    if (!question) return NextResponse.json({ error: 'Question not found' }, { status: 404 });

    question.reply = reply.trim();
    question.status = status || 'answered';
    question.repliedBy = admin._id;
    question.repliedAt = new Date();
    await question.save();

    try {
      await sendQuestionReplyEmail({
        to: question.email,
        name: question.name,
        specialist: question.specialist,
        question: question.question,
        reply: question.reply
      });
    } catch (e) {
      console.error('Failed to send reply email:', e);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Admin reply error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

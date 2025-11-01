// Generate Admin JWT Token for Testing
// Run this with: node generate-admin-token.js

const jwt = require('jsonwebtoken');

// Mock admin data
const adminData = {
  userId: '507f1f77bcf86cd799439011', // Mock ObjectId
  email: 'admin@test.com',
  role: 'admin',
  firstName: 'Test',
  lastName: 'Admin'
};

// Use same secret as in your route
const JWT_SECRET = process.env.JWT_SECRET || 'doctar_jwt_secret_key_2025';

// Generate token (expires in 7 days)
const token = jwt.sign(adminData, JWT_SECRET, { expiresIn: '7d' });

console.log('\n========================================');
console.log('Admin JWT Token Generated!');
console.log('========================================\n');
console.log('Token:');
console.log(token);
console.log('\n========================================');
console.log('Use this token in your API requests:');
console.log('========================================');
console.log(`Authorization: Bearer ${token}`);
console.log('\nOR\n');
console.log(`token: ${token}`);
console.log('========================================\n');

// Copy to clipboard if possible
console.log('Copy the token above and use it in Thunder Client or PowerShell script!');
console.log('\nToken expires in: 7 days\n');

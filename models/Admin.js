import mongoose from "mongoose";


const adminSchema = new mongoose.Schema({
    //Baisc Info
    firstName : {
        type : String,
        required : true,
        trim : true
    },
     lastName: {
    type: String,
    required: true,
    trim: true
  },
   email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 8
  },
  

  //admin Specific information 
  role : {
    type : String,
    enum : ['admin','super_admin'],
    default : 'admin'
  } ,
  permissions:{
    userManagement: {
      type: Boolean,
      default: true
    },
    doctorManagement: {
      type: Boolean,
      default: true
    },
    contentManagement: {
      type: Boolean,
      default: true
    },
    systemSettings: {
      type: Boolean,
      default: false
    },
    analytics: {
      type: Boolean,
      default: true
    }
  },


  //account status
  isActive: {
    type: Boolean,
    default: true
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  lastLogin: {
    type: Date,
    default: null
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: {
    type: Date,
    default: null
  },


   // Profile Information
  avatar: {
    type: String,
    default: null
  },
  avatarPublicId: {
    type: String,
    default: null
  },
  phone: {
    type: String,
    trim: true,
    default: null
  },
  department: {
    type: String,
    trim: true,
    default: 'Administration'
  },


  // Security
  twoFactorSecret: {
    type: String,
    default: null
  },
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  
   // Audit Trail
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    default: null
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    default: null
  },


  // Activity Tracking
  activityLog: [{
    action: {
      type: String,
      required: true
    },
    target: {
      type: String,
      required: true
    },
    targetId: {
      type: String,
      required: true
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    ipAddress: {
      type: String,
      default: null
    }
  }]
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.twoFactorSecret;
      delete ret.__v;
      return ret;
    }
  }

  
});

// Indexes for performance
adminSchema.index({ email: 1 });
adminSchema.index({ role: 1 });
adminSchema.index({ isActive: 1 });
adminSchema.index({ lastLogin: -1 });


// Virtual for full name
adminSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});


// Methods
adminSchema.methods.updateLastLogin = function() {
  this.lastLogin = new Date();
  this.loginAttempts = 0;
  this.lockUntil = null;
  return this.save();
};


adminSchema.methods.incLoginAttempts = function() {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $set: {
        loginAttempts: 1
      },
      $unset: {
        lockUntil: 1
      }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  // If we have hit max attempts and it's not locked, lock it
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // 2 hours
  }
  
  return this.updateOne(updates);
};



adminSchema.methods.addActivityLog = function(action, target, targetId, details = {}, ipAddress = null) {
  this.activityLog.push({
    action,
    target,
    targetId,
    details,
    ipAddress,
    timestamp: new Date()
  });
  
  // Keep only last 100 activities
  if (this.activityLog.length > 100) {
    this.activityLog = this.activityLog.slice(-100);
  }
  
  return this.save();
};

// Virtual for account lock status
adminSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Static methods
adminSchema.statics.getFailedLoginReasons = function() {
  return {
    NOT_FOUND: 0,
    PASSWORD_INCORRECT: 1,
    MAX_ATTEMPTS: 2
  };
};

// Pre-save middleware to hash password
adminSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const bcrypt = require('bcryptjs');
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Ensure model is only compiled once
const Admin = mongoose.models.Admin || mongoose.model('Admin', adminSchema);

export default Admin;
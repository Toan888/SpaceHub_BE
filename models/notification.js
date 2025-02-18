import mongoose, { Schema } from "mongoose";

const notificationsSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'users',
    required: true
  },
  imageUrl: {
    type: String,
    required: false
  },
  content: {
    type: String,
    required: true
  },
  url: {
    type: String,
    required: false
  },
  isRead: {
    type: Boolean,
    default: false
  },
  expireAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

notificationsSchema.pre('save', function(next) {
  if (this.isModified('isRead') && this.isRead && !this.expireAt) {
    this.expireAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  }
  next();
});

notificationsSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });
export default mongoose.model('Notification', notificationsSchema);
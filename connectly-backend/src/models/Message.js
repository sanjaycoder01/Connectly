const mongoose = require("mongoose");

const MESSAGE_STATUS = {
  SENT: "sent",
  DELIVERED: "delivered",
  READ: "read",
};

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
    },

    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    content: {
      type: String,
      required: true,
      trim: true,
    },

    clientMessageId: {
      type: String,
      trim: true,
    },

    status: {
      type: String,
      enum: Object.values(MESSAGE_STATUS),
      default: MESSAGE_STATUS.SENT,
    },

    deliveredAt: {
      type: Date,
    },

    readAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index(
  { senderId: 1, clientMessageId: 1 },
  { unique: true, sparse: true }
);
messageSchema.index({ conversationId: 1, senderId: 1, status: 1 });

module.exports = mongoose.model("Message", messageSchema);
module.exports.MESSAGE_STATUS = MESSAGE_STATUS;

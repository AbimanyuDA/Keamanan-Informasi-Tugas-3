const mongoose = require("mongoose");

// Define schemas inline for migration
const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, enum: ["organization", "consultant"], required: true },
  organizationName: { type: String },
  position: { type: String },
  createdAt: { type: Date, default: Date.now },
  hasKeys: { type: Boolean, default: false },
});

const UserKeysSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  publicKey: { type: String, required: true },
  privateKeyEncrypted: { type: String, required: true },
  certificate: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const UserModel = mongoose.models.User || mongoose.model("User", UserSchema);
const UserKeysModel =
  mongoose.models.UserKeys || mongoose.model("UserKeys", UserKeysSchema);

async function migrateHasKeys() {
  try {
    await mongoose.connect("mongodb://localhost:27017/pdf-signature-system");

    // Find all users who have keys but hasKeys is false
    const usersWithKeys = await UserKeysModel.find({});
    const userIds = usersWithKeys.map((k) => k.userId);

    const usersToUpdate = await UserModel.find({
      _id: { $in: userIds },
      hasKeys: false,
    });

    if (usersToUpdate.length > 0) {
      await UserModel.updateMany(
        { _id: { $in: userIds }, hasKeys: false },
        { hasKeys: true }
      );
      console.log("✅ Updated hasKeys for", usersToUpdate.length, "users");
    } else {
      console.log("ℹ️  No users need migration");
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error.message);
    process.exit(1);
  }
}

migrateHasKeys();

module.exports = {
    // ডাটাবেস নাম (telitask) সরাসরি লিংকের ভেতরে যোগ করে দেওয়া হয়েছে
    MONGO_URI: "mongodb+srv://mongodbpy_db_user:pPgtRKyHsm8GvJF2@cluster0.u2ft5ps.mongodb.net/?appName=Cluster0", 
    
    // ⚠️ এখানে আপনার টেলিগ্রাম নাম্বারিক আইডি দিতে হবে (যেমন: 123456789)
    ADMIN_TELEGRAM_ID: "8248792819", 
    
    // ⚠️ BotFather থেকে নেওয়া আপনার বটের টোকেন দিন
    BOT_TOKEN: "8411636239:AAHI1_LaC2FrIflzZ3-uIvjA07bOp2uhWO4",

    // পোর্ট অটোমেটিক সিলেক্ট হবে
    PORT: process.env.PORT || 5000
};

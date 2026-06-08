module.exports = {
    // ⚠️ এখানে আপনার MongoDB Atlas এর পাসওয়ার্ড এবং ডাটাবেস নাম দিন
    MONGO_URI: "mongodb+srv://mongodbpy_db_user:pPgtRKyHsm8GvJF2@cluster0.u2ft5ps.mongodb.net/telitask?retryWrites=true&w=majority&appName=Cluster0", 
    
    // ⚠️ এখানে আপনার টেলিগ্রাম নাম্বারিক আইডি দিন
    ADMIN_TELEGRAM_ID: "8248792819", 
    
    // ⚠️ BotFather থেকে নেওয়া আপনার বটের টোকেন দিন
    BOT_TOKEN: "আপনার_বট_টোকেন_এখানে_দিন",

    // পোর্ট অটোমেটিক সিলেক্ট হবে (Render বা Local যেখানেই চলুক)
    PORT: process.env.PORT || 5000
};

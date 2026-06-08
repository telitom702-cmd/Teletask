const TelegramBot = require('node-telegram-bot-api');
const config = require('./config');

const token = config.BOT_TOKEN;
if (!token || token === "আপনার_বট_টোকেন_এখানে_দিন") {
    console.error("❌ BOT_TOKEN config.js ফাইলে সঠিকভাবে দেওয়া হয়নি!");
    // টোকেন না থাকলে বট রান হবে না, তবে ওয়েবসাইট রান হবে
} else {
    const bot = new TelegramBot(token, { polling: true });

    bot.onText(/\/start/, (msg) => {
        const chatId = msg.chat.id;
        const firstName = msg.from.first_name || "User";

        // 🟢 অটোমেটিক সার্ভারের লিংক বের করে নিচ্ছে (Render, Vercel বা Local যেখানেই চলুক)
        const webAppUrl = process.env.RENDER_EXTERNAL_URL || process.env.URL || `http://localhost:${config.PORT}`;

        const options = {
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: "🚀 TeliTask Pro খুলুন",
                            web_app: { url: webAppUrl }
                        }
                    ]
                ]
            }
        };

        const welcomeMessage = `
👋 স্বাগতম, ${firstName}!

TeliTask Pro-তে আপনাকে স্বাগতম। টাস্ক করুন, পয়েন্ট অর্জন করুন এবং সহজেই টাকা উত্তোলন করুন!

নিচের বাটনে ক্লিক করে অ্যাপটি খুলুন 👇
        `;

        bot.sendMessage(chatId, welcomeMessage, options);
    });

    console.log("🤖 Telegram Bot is running...");
}

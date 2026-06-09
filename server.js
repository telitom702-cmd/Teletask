const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path'); 
const config = require('./config');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// --- MongoDB Connection ---
const connectDB = async () => {
    if (mongoose.connection.readyState >= 1) return;
    try {
        await mongoose.connect(config.MONGO_URI);
        console.log("✅ MongoDB Connected to DB: telitask");
    } catch (error) {
        console.error("❌ MongoDB Connection Error:", error);
    }
};
connectDB();

// --- MongoDB Models ---
const UserSchema = new mongoose.Schema({
    uid: { type: String, required: true, unique: true },
    name: String,
    username: String,
    deviceId: String,
    balance: { type: Number, default: 0 },
    isBanned: { type: Boolean, default: false },
    vpnInfo: Object,
    completedTasks: [Number],  // ✅ FIXED: Add completed tasks array
    settings: { autoReward: { type: Boolean, default: true } }
}, { timestamps: true });

const TaskSchema = new mongoose.Schema({ 
    id: { type: Number, required: true, unique: true }, 
    title: String, 
    link: String, 
    reward: Number, 
    type: String 
});

const NotificationSchema = new mongoose.Schema({ 
    type: String, 
    target: String, 
    title: String, 
    msg: String, 
    time: { type: Date, default: Date.now } 
});

const WithdrawSchema = new mongoose.Schema({ 
    id: Number, 
    uid: String, 
    amount: Number, 
    method: String, 
    number: String, 
    status: { type: String, default: 'pending' } 
});

const SettingsSchema = new mongoose.Schema({ 
    key: { type: String, unique: true }, 
    value: mongoose.Schema.Types.Mixed 
});

const TaskHistorySchema = new mongoose.Schema({
    uid: { type: String, required: true },
    taskId: { type: Number, required: true },
    taskTitle: String,
    reward: Number,
    completedAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);
const Task = mongoose.model('Task', TaskSchema);
const Notification = mongoose.model('Notification', NotificationSchema);
const Withdraw = mongoose.model('Withdraw', WithdrawSchema);
const Setting = mongoose.model('Setting', SettingsSchema);
const TaskHistory = mongoose.model('TaskHistory', TaskHistorySchema);

// --- Helper: Admin Check ---
const isAdmin = async (req, res, next) => {
    const adminUid = req.headers['admin-uid'] || req.body.adminUid;
    if (adminUid !== config.ADMIN_TELEGRAM_ID) return res.status(403).json({ message: "Access Denied" });
    next();
};

// --- API ROUTES ---

// ✅ FIXED: User Registration - Proper save
app.post('/api/register', async (req, res) => {
    const { uid, name, username, deviceId, vpnInfo, settings } = req.body;
    if (!uid) return res.status(400).json({ error: "Telegram UID required" });
    try {
        let user = await User.findOne({ uid });
        if (!user) { 
            user = new User({ uid, name, username, deviceId, vpnInfo, settings, completedTasks: [] }); 
        } else {
            if (name) user.name = name; 
            if (username) user.username = username;
            if (deviceId) user.deviceId = deviceId;
            if (vpnInfo) user.vpnInfo = vpnInfo; 
            if (settings) user.settings = { ...user.settings, ...settings };
        }
        await user.save(); 
        res.json(user);
    } catch (err) { 
        console.error("Register Error:", err);
        res.status(500).json({ error: err.message }); 
    }
});

// ✅ FIXED: Get user with proper data
app.get('/api/user/:uid', async (req, res) => { 
    try {
        const user = await User.findOne({ uid: req.params.uid }); 
        if (!user) return res.status(404).json({ error: "User not found" });
        
        // Return user directly with all data
        const userObj = user.toObject();
        if (!userObj.completedTasks) {
            userObj.completedTasks = [];
        }
        res.json(userObj); 
    } catch (error) {
        console.error("User fetch error:", error);
        res.status(500).json({ error: "Server Error fetching user" });
    }
});

app.get('/api/admin/users', isAdmin, async (req, res) => { 
    try {
        const users = await User.find(); 
        res.json(users); 
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ✅ FIXED: Complete task with proper tracking
app.post('/api/complete-task', async (req, res) => {
    const { uid, taskId, reward, title } = req.body;
    
    try {
        const rewardSetting = await Setting.findOne({ key: 'rewardEnabled' });
        if (rewardSetting && rewardSetting.value === false) 
            return res.json({ success: false, message: 'রিওয়ার্ড বর্তমানে বন্ধ আছে!' });
        
        const user = await User.findOne({ uid });
        if (!user) return res.json({ success: false, message: 'ইউজার পাওয়া যায়নি!' });
        
        if (user.isBanned) 
            return res.json({ success: false, message: 'আপনার একাউন্ট ব্যান করা হয়েছে!' });
        
        // Check if already completed
        if (user.completedTasks && user.completedTasks.includes(Number(taskId))) 
            return res.json({ success: false, message: 'আপনি এই টাস্কটি আগেই করেছেন!' });
        
        // Update user balance and completed tasks
        user.balance += Number(reward); 
        if (!user.completedTasks) user.completedTasks = [];
        user.completedTasks.push(Number(taskId));  // ✅ Add to array
        await user.save(); 
        
        // Save task history
        const history = new TaskHistory({ uid, taskId: Number(taskId), taskTitle: title, reward });
        await history.save();
        
        res.json({ success: true, message: 'টাকা যোগ হয়েছে!' });
    } catch (error) {
        console.error("Complete task error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
});

app.get('/api/tasks', async (req, res) => { 
    try {
        const tasks = await Task.find(); 
        res.json(tasks); 
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/tasks', isAdmin, async (req, res) => { 
    try {
        const newTask = new Task(req.body); 
        await newTask.save(); 
        res.json({ success: true }); 
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/tasks/:id', isAdmin, async (req, res) => { 
    try {
        await Task.findOneAndDelete({ id: parseInt(req.params.id) }); 
        res.json({ success: true }); 
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/notifications/:uid', async (req, res) => {
    try {
        const notifs = await Notification.find({ 
            $or: [{ type: 'global' }, { target: req.params.uid }] 
        }).sort({ time: -1 }); 
        res.json(notifs);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/notification', isAdmin, async (req, res) => { 
    try {
        const newNotif = new Notification(req.body); 
        await newNotif.save(); 
        res.json({ success: true }); 
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/withdraw', async (req, res) => {
    try {
        const { id, uid, amount, method, number } = req.body; 
        const user = await User.findOne({ uid });
        
        if (!user || user.balance < amount) 
            return res.json({ error: "পর্যাপ্ত ব্যালেন্স নেই" });
        
        user.balance -= Number(amount); 
        await user.save();
        
        const newWithdraw = new Withdraw({ id, uid, amount, method, number, status: 'pending' }); 
        await newWithdraw.save(); 
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/withdraws', isAdmin, async (req, res) => { 
    try {
        const withdraws = await Withdraw.find({ status: 'pending' }); 
        res.json(withdraws); 
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/withdraw-action', isAdmin, async (req, res) => {
    try {
        const { id, status } = req.body; 
        const withdraw = await Withdraw.findOne({ id });
        
        if (withdraw && status === 'rejected') { 
            const user = await User.findOne({ uid: withdraw.uid }); 
            if (user) { 
                user.balance += withdraw.amount; 
                await user.save(); 
            } 
        }
        
        await Withdraw.updateOne({ id }, { status }); 
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/admin/toggle-ban', isAdmin, async (req, res) => { 
    try {
        const user = await User.findOne({ uid: req.body.uid }); 
        if (user) { 
            user.isBanned = !user.isBanned; 
            await user.save(); 
        } 
        res.json({ success: true }); 
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/admin/update-balance', isAdmin, async (req, res) => { 
    try {
        const { uid, amount } = req.body; 
        const user = await User.findOne({ uid }); 
        if (user) { 
            user.balance += Number(amount); 
            await user.save(); 
        } 
        res.json({ success: true }); 
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/settings', async (req, res) => { 
    try {
        const settings = await Setting.find(); 
        const settingsObj = {}; 
        settings.forEach(s => settingsObj[s.key] = s.value); 
        res.json(settingsObj); 
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/settings', isAdmin, async (req, res) => { 
    try {
        const keys = Object.keys(req.body); 
        for (const key of keys) { 
            await Setting.findOneAndUpdate({ key }, { value: req.body[key] }, { upsert: true }); 
        }
        res.json({ success: true }); 
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/check-admin/:uid', async (req, res) => { 
    res.json({ isAdmin: req.params.uid === config.ADMIN_TELEGRAM_ID }); 
});

// --- Error Handler ---
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Server error' });
});

// --- Server Start ---
if (process.env.VERCEL) {
    module.exports = app;
} else {
    const PORT = config.PORT;
    app.listen(PORT, () => { 
        console.log(`🚀 Server running on http://localhost:${PORT}`);
        try {
            require('./bot');
            console.log("🤖 Telegram Bot Initiated!");
        } catch (error) {
            console.error("❌ Bot Init Failed:", error.message);
        }
    });
}

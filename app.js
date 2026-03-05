import 'dotenv/config';
import wolfjs from 'wolf.js';
import express from 'express';
const { WOLF } = wolfjs;

const app = express();
const service = new WOLF();

// دالة معالجة الوقت وتوقيت السعودية (UTC+3)
const processTime = (dateStr) => {
    const date = new Date(dateStr);
    const ksaDate = new Date(date.getTime() + (3 * 60 * 60 * 1000));
    return {
        hour: ksaDate.getUTCHours().toString(),
        minute: String(ksaDate.getUTCMinutes()).padStart(2, '0'),
        fullKsa: ksaDate.toISOString().split('T')[0]
    };
};

// هذا هو المسار الذي كان مفقوداً ويسبب خطأ Not Found
app.get('/events', async (req, res) => {
    const { room, date } = req.query; 
    console.log(`🔍 طلب جديد لروم: ${room} بتاريخ: ${date}`);

    try {
        const response = await service.websocket.emit('group event list', { 
            id: parseInt(room),
            languageId: 1,
            subscribe: true 
        });

        if (!response.success) return res.status(400).json({ error: "فشل الجلب من WOLF" });

        const foundEvents = [];
        for (const ev of response.body) {
            const timeInfo = processTime(ev.startsAt);
            if (timeInfo.fullKsa === date) {
                foundEvents.push({ 
                    id: ev.id.toString(), 
                    name: ev.title || "فعالية بدون عنوان", 
                    hour: timeInfo.hour,
                    minute: timeInfo.minute
                });
            }
        }
        res.json(foundEvents);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// مسار افتراضي للتأكد أن السيرفر يعمل
app.get('/', (req, res) => res.send("✅ سيرفر فعاليات WOLF يعمل بنجاح!"));

service.on('ready', () => {
    console.log(`🚀 البوت متصل والـ API جاهز`);
    app.listen(3000, () => console.log('Listening on port 3000'));
});

service.login(process.env.U_MAIL, process.env.U_PASS);

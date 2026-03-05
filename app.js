import 'dotenv/config';
import wolfjs from 'wolf.js';
import express from 'express';
const { WOLF } = wolfjs;

const app = express();
const service = new WOLF();

// دالة لمعالجة الوقت بتوقيت السعودية
const processTime = (dateStr) => {
    const date = new Date(dateStr);
    const ksaDate = new Date(date.getTime() + (3 * 60 * 60 * 1000));
    return {
        hour: ksaDate.getUTCHours().toString(),
        minute: String(ksaDate.getUTCMinutes()).padStart(2, '0'),
        fullKsa: ksaDate.toISOString().split('T')[0]
    };
};

app.get('/events', async (req, res) => {
    const { room, date } = req.query; // استلام رقم الروم والتاريخ من التطبيق

    try {
        const response = await service.websocket.emit('group event list', { 
            id: parseInt(room),
            languageId: 1,
            subscribe: true 
        });

        if (!response.success) return res.status(400).json({ error: "فشل جلب البيانات من WOLF" });

        const foundEvents = [];
        for (const ev of response.body) {
            const timeInfo = processTime(ev.startsAt);

            // التحقق إذا كانت الفعالية في التاريخ المطلوب
            if (timeInfo.fullKsa === date) {
                foundEvents.push({ 
                    id: ev.id.toString(), 
                    name: ev.title || "فعالية بدون عنوان", // سحب العنوان الحقيقي من القناة
                    hour: timeInfo.hour,
                    minute: timeInfo.minute
                });
            }
        }

        // ترتيب الفعاليات حسب الوقت
        foundEvents.sort((a, b) => parseInt(a.hour) - parseInt(b.hour));
        
        console.log(`✅ تم إرسال ${foundEvents.length} فعالية للروم ${room}`);
        res.json(foundEvents);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

service.on('ready', () => {
    console.log(`🚀 البوت متصل والـ API جاهز على المنفذ 3000`);
    app.listen(3000);
});

service.login(process.env.U_MAIL, process.env.U_PASS);

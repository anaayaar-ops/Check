import 'dotenv/config';
import wolfjs from 'wolf.js';
import express from 'express'; // أضف هذه المكتبة
const { WOLF } = wolfjs;

const app = express();
const service = new WOLF();

const eventNames = ["سوالف وافكار", "تحديات", "ساعة تسلية", "شغّل عقلك", /* ... باقي القائمة ... */];

// دالة لمعالجة الوقت
const formatTimeData = (date) => {
    const ksaDate = new Date(date.getTime() + (3 * 60 * 60 * 1000));
    return {
        hour: ksaDate.getUTCHours().toString(),
        minute: String(ksaDate.getUTCMinutes()).padStart(2, '0')
    };
};

app.get('/get-events', async (req, res) => {
    const targetGroup = req.query.room; // استلام رقم الروم من التطبيق
    const targetDate = req.query.date; // استلام التاريخ من التطبيق

    try {
        const response = await service.websocket.emit('group event list', { 
            id: parseInt(targetGroup),
            languageId: 1,
            subscribe: true 
        });

        if (!response.success) return res.status(400).json({ error: "Failed to fetch" });

        const results = [];
        response.body.forEach((ev) => {
            const startTime = new Date(ev.startsAt);
            const ksaDate = new Date(startTime.getTime() + (3 * 60 * 60 * 1000));
            const dateStr = ksaDate.toISOString().split('T')[0];

            if (dateStr === targetDate) {
                const timeData = formatTimeData(startTime);
                results.add({
                    id: ev.id.toString(),
                    hour: timeData.hour,
                    minute: timeData.minute
                });
            }
        });

        res.json(results); // إرسال النتائج لتطبيق Flutter
    } catch (err) {
        res.status(500).send(err.message);
    }
});

service.on('ready', () => {
    console.log(`✅ البوت جاهز والـ API يعمل على منفذ 3000`);
    app.listen(3000);
});

service.login(process.env.U_MAIL, process.env.U_PASS);

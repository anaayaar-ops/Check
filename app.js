import 'dotenv/config';
import wolfjs from 'wolf.js';
const { WOLF } = wolfjs;

const service = new WOLF();

const TARGET_GROUP = 18432094;
const TARGET_DATE = "2026-07-22";       // التاريخ المطلوب
const TARGET_MEMBER_ID = 80055399;      // العضوية التي رفعت الفعالية

const formatTime = (date) => {
    const h = date.getUTCHours();
    const m = String(date.getUTCMinutes()).padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    return `${h % 12 || 12}:${m} ${ampm}`;
};

service.on('ready', async () => {
    console.log(`✅ متصل بـ: ${service.currentSubscriber.nickname}`);

    try {
        // 1) جلب القائمة المختصرة لتحديد الفعاليات ضمن اليوم المستهدف
        const listResponse = await service.websocket.emit('group event list', {
            id: parseInt(TARGET_GROUP),
            languageId: 1,
            subscribe: true
        });

        if (!listResponse.success) {
            console.log("❌ فشل جلب قائمة الفعاليات");
            return process.exit();
        }

        const dayEventIds = [];
        for (const ev of listResponse.body) {
            const info = ev.additionalInfo || {};
            const startTimeStr = info.startsAt || ev.startsAt;
            if (!startTimeStr) continue;

            const startTime = new Date(startTimeStr);
            const ksaStart = new Date(startTime.getTime() + (3 * 60 * 60 * 1000)); // UTC+3

            const dateStr = `${ksaStart.getUTCFullYear()}-${String(ksaStart.getUTCMonth() + 1).padStart(2, '0')}-${String(ksaStart.getUTCDate()).padStart(2, '0')}`;
            if (dateStr !== TARGET_DATE) continue;

            dayEventIds.push({ id: ev.id, dateStr, start: ksaStart });
        }

        // 2) جلب تفاصيل كل فعالية للحصول على createdBy الحقيقي
        const fullEvents = await service.event.getByIds(dayEventIds.map(e => e.id), true);

        const foundEvents = [];

        fullEvents.forEach((fullEv) => {
            const meta = dayEventIds.find(e => e.id === fullEv.id);
            if (!meta) return;

            if (fullEv.createdBy !== null && parseInt(fullEv.createdBy) === TARGET_MEMBER_ID) {
                foundEvents.push({
                    id: fullEv.id,
                    dateStr: meta.dateStr,
                    start: meta.start
                });
            }
        });

        foundEvents.sort((a, b) => a.start - b.start);

        console.log(`\n📋 فعاليات ${TARGET_DATE} المرفوعة من العضوية ${TARGET_MEMBER_ID}:`);
        console.log("=".repeat(60));

        foundEvents.forEach((ev, i) => {
            console.log(`${(i + 1).toString().padStart(2, '0')}- 🆔 ID: ${ev.id}`);
            console.log(`   📅 التاريخ: ${ev.dateStr}`);
            console.log(`   ⏰ الوقت: ${formatTime(ev.start)}`);
            console.log("-".repeat(40));
        });

        console.log(`🏁 إجمالي الفعاليات: ${foundEvents.length}`);

    } catch (err) {
        console.error("❌ خطأ:", err.message);
    }
    process.exit();
});

service.login(process.env.U_MAIL, process.env.U_PASS);

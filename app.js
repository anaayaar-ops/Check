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

// يحاول إيجاد معرّف العضو الذي أنشأ الفعالية من عدة أسماء حقول محتملة
// (يختلف اسم الحقل حسب نسخة الـ API، لذا نتحقق من كل الاحتمالات)
const getCreatorId = (ev) => {
    const info = ev.additionalInfo || {};
    return (
        ev.createdBy ??
        ev.creatorId ??
        ev.ownerId ??
        ev.subscriberId ??
        info.createdBy ??
        info.creatorId ??
        info.ownerId ??
        info.subscriberId ??
        null
    );
};

service.on('ready', async () => {
    console.log(`✅ متصل بـ: ${service.currentSubscriber.nickname}`);

    try {
        const response = await service.websocket.emit('group event list', {
            id: parseInt(TARGET_GROUP),
            languageId: 1,
            subscribe: true
        });

        if (!response.success) {
            console.log("❌ فشل جلب قائمة الفعاليات");
            return process.exit();
        }

        const foundEvents = [];

        for (const ev of response.body) {
            const info = ev.additionalInfo || {};
            const startTimeStr = info.startsAt || ev.startsAt;
            if (!startTimeStr) continue;

            const startTime = new Date(startTimeStr);
            const ksaStart = new Date(startTime.getTime() + (3 * 60 * 60 * 1000)); // UTC+3

            const dateStr = `${ksaStart.getUTCFullYear()}-${String(ksaStart.getUTCMonth() + 1).padStart(2, '0')}-${String(ksaStart.getUTCDate()).padStart(2, '0')}`;

            if (dateStr !== TARGET_DATE) continue;

            const creatorId = getCreatorId(ev);

            // نطبع تحذيراً إذا لم نجد حقل المنشئ إطلاقاً (أول مرة فقط) حتى تعرف اسم الحقل الصحيح
            if (creatorId === null) {
                console.log("⚠️ لم يتم العثور على حقل معرف المنشئ في بيانات الفعالية. راجع الحقول التالية:");
                console.log(JSON.stringify(ev, null, 2));
                continue;
            }

            if (parseInt(creatorId) !== TARGET_MEMBER_ID) continue;

            foundEvents.push({
                id: ev.id,
                dateStr,
                start: ksaStart
            });
        }

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

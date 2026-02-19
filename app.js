import 'dotenv/config';
import wolfjs from 'wolf.js';
const { WOLF } = wolfjs;

const service = new WOLF();

// --- الإعدادات ---
const TARGET_GROUP = 9969;
const TARGET_DATE = "2026-02-20"; 
// ----------------

const formatAMPM = (dateInput) => {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return "وقت غير معروف";
    let hours = date.getHours();
    let minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'م' : 'ص';
    hours = hours % 12 || 12;
    minutes = minutes < 10 ? '0' + minutes : minutes;
    return `${hours}:${minutes} ${ampm}`;
};

service.on('ready', async () => {
    console.log(`✅ تم تسجيل الدخول: ${service.currentSubscriber.nickname}`);
    console.log(`🔍 جاري الفحص...`);

    try {
        // نستخدم 'group event list' مع groupId
        const response = await service.websocket.emit('group event list', { 
            id: parseInt(TARGET_GROUP),
            languageId: 1
        });

        if (!response.success) {
            console.error("❌ فشل جلب القائمة:", response.body);
            return;
        }

        const events = response.body;

        // فلترة الفعاليات مع التأكد من صحة التاريخ لتجنب الـ RangeError
        const filtered = events.filter(event => {
            if (!event.startsAt) return false;
            
            const d = new Date(event.startsAt);
            if (isNaN(d.getTime())) return false; // تجاهل التواريخ الفاسدة

            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            const eventDateStr = `${year}-${month}-${day}`;

            return eventDateStr === TARGET_DATE;
        });

        if (filtered.length === 0) {
            console.log(`📭 لا توجد فعاليات في تاريخ ${TARGET_DATE}`);
        } else {
            console.log(`📋 تم العثور على (${filtered.length}) فعاليات ليوم ${TARGET_DATE}:`);
            console.log("--------------------------------------");
            
            filtered.forEach((event, index) => {
                console.log(`${index + 1}- [${event.title}]`);
                console.log(`   ⏰ الوقت: ${formatAMPM(event.startsAt)}`);
                console.log(`   🆔 المعرف (ID): ${event.id}`);
                console.log("--------------------------------------");
            });
        }

    } catch (err) {
        console.error("❌ خطأ غير متوقع:", err.message);
    }
    process.exit();
});

const u = process.env.U_MAIL;
const p = process.env.U_PASS;
if (u && p) service.login(u, p);

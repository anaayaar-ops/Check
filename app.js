import 'dotenv/config';
import wolfjs from 'wolf.js';
const { WOLF } = wolfjs;

const service = new WOLF();

// --- الإعدادات ---
const TARGET_GROUP = 18432094;
const TARGET_DATE = "2026-02-20"; 
// ----------------

const formatAMPM = (dateStr) => {
    const date = new Date(dateStr);
    let hours = date.getHours();
    let minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'م' : 'ص';
    hours = hours % 12 || 12;
    minutes = minutes < 10 ? '0' + minutes : minutes;
    return `${hours}:${minutes} ${ampm}`;
};

service.on('ready', async () => {
    console.log(`✅ تم تسجيل الدخول: ${service.currentSubscriber.nickname}`);
    console.log(`🔍 فحص الروم: ${TARGET_GROUP} | التاريخ: ${TARGET_DATE}\n`);

    try {
        // محاولة جلب الفعاليات
        const response = await service.websocket.emit('group event list', { 
            id: parseInt(TARGET_GROUP), // التأكد من أنه رقم
            subscribe: true // الاشتراك في تحديثات الفعاليات (قد يساعد في الصلاحيات)
        });

        if (!response.success) {
            // طباعة تفاصيل الخطأ القادم من السيرفر (مثل Forbidden أو Not Found)
            console.error("❌ فشل الطلب من السيرفر:");
            console.error(`كود الخطأ: ${response.code}`);
            console.error(`الرسالة: ${JSON.stringify(response.body)}`);
            
            if(response.code === 403) console.log("💡 نصيحة: البوت يحتاج صلاحيات (Admin) أو أن يكون عضواً في الروم.");
            return;
        }

        const events = response.body;

        if (!Array.isArray(events)) {
            console.log("⚠️ استجابة غريبة من السيرفر (ليست قائمة):", events);
            return;
        }

        const filtered = events.filter(event => {
            const eventDate = new Date(event.startsAt).toISOString().split('T')[0];
            return eventDate === TARGET_DATE;
        });

        if (filtered.length === 0) {
            console.log(`📭 لا توجد فعاليات مجدولة ليوم ${TARGET_DATE}`);
        } else {
            console.log(`📋 تم العثور على (${filtered.length}) فعاليات:`);
            console.log("=".repeat(40));
            
            filtered.forEach((event, index) => {
                console.log(`${index + 1}- [${event.title}]`);
                console.log(`   ⏰ الوقت: ${formatAMPM(event.startsAt)}`);
                console.log(`   🆔 المعرف: ${event.id}`);
                console.log("-".repeat(20));
            });
        }

    } catch (err) {
        console.error("❌ خطأ برمججي مفاجئ:", err);
    }
    process.exit();
});

// تشغيل البوت
const email = process.env.U_MAIL;
const pass = process.env.U_PASS;

if (email && pass) {
    service.login(email, pass);
} else {
    console.error("❌ تأكد من إعداد U_MAIL و U_PASS في ملف .env");
}

import 'dotenv/config';
import wolfjs from 'wolf.js';
const { WOLF } = wolfjs;

const service = new WOLF();

// --- الإعدادات ---
const TARGET_GROUP = 18432094; 
const TARGET_DATE = "2026-02-21"; // التاريخ المستهدف للبحث
// ----------------

service.on('ready', async () => {
    console.log(`✅ تم تسجيل الدخول: ${service.currentSubscriber.nickname}`);
    
    try {
        console.log(`📡 جاري سحب وتحليل بيانات الـ Line-up لـ ${TARGET_GROUP}...`);
        
        const response = await service.websocket.emit('group event list', { 
            id: parseInt(TARGET_GROUP),
            languageId: 1,
            subscribe: true 
        });

        if (!response.success) {
            console.log("❌ فشل جلب البيانات من السيرفر.");
            process.exit();
        }

        const rawEvents = response.body;
        const foundEvents = [];

        for (const ev of rawEvents) {
            // الوصول للبيانات داخل additionalInfo كما ظهر في التجربة السابقة
            const info = ev.additionalInfo || {};
            const startTimeStr = info.startsAt || ev.startsAt;
            
            if (!startTimeStr) continue;

            const startTime = new Date(startTimeStr);
            
            // تعديل التوقيت ليتناسب مع توقيت السعودية (UTC+3) لضمان دقة التاريخ
            const ksaDate = new Date(startTime.getTime() + (3 * 60 * 60 * 1000));
            
            const year = ksaDate.getUTCFullYear();
            const month = String(ksaDate.getUTCMonth() + 1).padStart(2, '0');
            const day = String(ksaDate.getUTCDate()).padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;

            // إذا تطابق التاريخ المجدول مع التاريخ المستهدف
            if (dateStr === TARGET_DATE) {
                foundEvents.push({
                    id: ev.id,
                    title: ev.title || "فعالية غير معنونة", // استخدام العنوان إذا وجد
                    rawDate: ksaDate
                });
            }
        }

        if (foundEvents.length === 0) {
            console.log(`📭 لم يتم العثور على فعاليات تطابق تاريخ ${TARGET_DATE}.`);
        } else {
            // ترتيب الفعاليات زمنياً من الأقدم للأحدث
            foundEvents.sort((a, b) => a.rawDate - b.rawDate);

            console.log(`✅ تم العثور على (${foundEvents.length}) فعالية:\n`);
            
            foundEvents.forEach((ev, i) => {
                const hours = ev.rawDate.getUTCHours();
                const minutes = String(ev.rawDate.getUTCMinutes()).padStart(2, '0');
                const ampm = hours >= 12 ? 'PM' : 'AM';
                const displayTime = `${hours % 12 || 12}:${minutes} ${ampm}`;
                const displayDate = `${ev.rawDate.getUTCDate()}/${ev.rawDate.getUTCMonth() + 1}/${ev.rawDate.getUTCFullYear()}`;

                console.log(`${i + 1}- اسم الفعالية: ${ev.title}`);
                console.log(`   ⏰ الوقت: ${displayTime}`);
                console.log(`   📅 التاريخ: ${displayDate}`);
                console.log(`   🆔 ID الفعالية: ${ev.id}`);
                console.log(`-----------------------------------`);
            });
        }
    } catch (err) {
        console.error("❌ خطأ أثناء المعالجة:", err.message);
    }
    process.exit();
});

service.login(process.env.U_MAIL, process.env.U_PASS);


import 'dotenv/config';
import wolfjs from 'wolf.js';
const { WOLF } = wolfjs;

const service = new WOLF();

// --- الإعدادات ---
const TARGET_GROUP = 9969; // تم التعديل إلى الروم المطلوب
const TARGET_DATE = "2026-02-20"; 
// ----------------

service.on('ready', async () => {
    console.log(`✅ تم تسجيل الدخول: ${service.currentSubscriber.nickname}`);
    console.log(`🔍 جاري فحص الروم: ${TARGET_GROUP} ليوم: ${TARGET_DATE}...`);

    try {
        // طلب الفعاليات
        const response = await service.websocket.emit('group event list', { 
            groupId: parseInt(TARGET_GROUP),
            languageId: 1
        });

        if (!response.success || !response.body) {
            console.log("❌ تعذر جلب الفعاليات. تأكد من وجود البوت في الروم.");
            process.exit();
        }

        const allEvents = response.body;

        // فلترة الفعاليات بناءً على التاريخ
        const filtered = allEvents.filter(ev => {
            const d = new Date(ev.startsAt);
            // استخراج التاريخ بصيغة YYYY-MM-DD
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}` === TARGET_DATE;
        });

        if (filtered.length === 0) {
            console.log(`📭 لا توجد فعاليات مجدولة في الروم (${TARGET_GROUP}) لهذا التاريخ.`);
            // عرض أقرب فعالية للتأكد من أن السيرفر يستجيب
            if(allEvents.length > 0) {
                console.log(`💡 تلميح: وجدنا فعاليات في تواريخ أخرى، مثلاً: ${new Date(allEvents[0].startsAt).toLocaleDateString()}`);
            }
        } else {
            console.log(`✅ تم العثور على (${filtered.length}) فعاليات:\n`);
            
            // ترتيب حسب الوقت
            filtered.sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt));

            filtered.forEach((ev, i) => {
                const d = new Date(ev.startsAt);
                const startTime = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
                const startDate = `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
                
                console.log(`${i + 1}- ${ev.title}`);
                console.log(`   الوقت: ${startTime}`);
                console.log(`   التاريخ: ${startDate}`);
                console.log(`   ID: ${ev.id}`);
                console.log("-----------------------------------");
            });
        }

    } catch (err) {
        console.error("❌ خطأ:", err.message);
    }
    process.exit();
});

service.login(process.env.U_MAIL, process.env.U_PASS);

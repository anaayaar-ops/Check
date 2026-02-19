import 'dotenv/config';
import wolfjs from 'wolf.js';
const { WOLF } = wolfjs;

const service = new WOLF();

// --- الإعدادات ---
const TARGET_GROUP = 18432094;
const TARGET_DATE = "2026-02-20"; // التاريخ المراد فحصه بصيغة YYYY-MM-DD
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
    console.log(`🔍 جاري فحص الفعاليات للتاريخ: ${TARGET_DATE} في الروم: ${TARGET_GROUP}\n`);

    try {
        // طلب قائمة الفعاليات من السيرفر
        const response = await service.websocket.emit('group event list', { 
            groupId: TARGET_GROUP, 
            languageId: 1 
        });

        if (!response.success) {
            throw new Error("فشل في جلب قائمة الفعاليات");
        }

        const events = response.body;
        
        // تصفية الفعاليات بناءً على التاريخ المحدد
        const filteredEvents = events.filter(event => {
            const eventDate = new Date(event.startsAt).toISOString().split('T')[0];
            return eventDate === TARGET_DATE;
        });

        if (filteredEvents.length === 0) {
            console.log("⚠️ لا توجد فعاليات مجدولة لهذا التاريخ.");
        } else {
            console.log(`📋 تم العثور على (${filteredEvents.length}) فعاليات:\n`);
            console.log("--------------------------------------------------");
            
            filteredEvents.forEach((event, index) => {
                const startTime = formatAMPM(event.startsAt);
                const eventDate = new Date(event.startsAt).toLocaleDateString('en-GB'); // DD/MM/YYYY
                
                console.log(`${index + 1}- الاسم: ${event.title}`);
                console.log(`   الوقت: ${startTime}`);
                console.log(`   التاريخ: ${eventDate}`);
                console.log(`   ID: ${event.id}`);
                console.log("--------------------------------------------------");
            });
        }

    } catch (err) {
        console.error("❌ خطأ أثناء الفحص:", err.message);
    }
    
    process.exit();
});

service.login(process.env.U_MAIL, process.env.U_PASS);

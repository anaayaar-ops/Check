import 'dotenv/config';
import wolfjs from 'wolf.js';
const { WOLF } = wolfjs;

const service = new WOLF();

const TARGET_GROUP = 9969; 
const TARGET_DATE = "2026-02-20"; 

service.on('ready', async () => {
    console.log(`✅ تم تسجيل الدخول: ${service.currentSubscriber.nickname}`);
    
    try {
        console.log(`📡 جاري سحب بيانات الـ Line-up...`);
        
        const response = await service.websocket.emit('group event list', { 
            id: parseInt(TARGET_GROUP),
            languageId: 1,
            subscribe: true 
        });

        if (!response.success) {
            console.log("❌ فشل جلب البيانات.");
            process.exit();
        }

        const rawEvents = response.body;
        const foundEvents = [];

        // أسماء الفعاليات بالترتيب كما تظهر في الصورة (لأن السيرفر أحياناً لا يرسل العنوان في الـ list)
        const eventNames = [
            "سوالف وافكار", "تحديات", "ساعة تسلية", "شغّل عقلك", "سوالف ونقاشات", "لعب وطرب", 
            "خمن الرقم", "سوالف صباحيه", "تحديات خليجنا ذوق", "تحديات ذهنية", "تحدي التخمين", 
            "صباحيات خليجنا ذوق", "تصادمات رقمية", "جيبها بالثانيه", "سوالف والعاب", "تحدي سهم"
        ];

        for (const ev of rawEvents) {
            // استخراج البيانات من داخل additionalInfo
            const info = ev.additionalInfo || {};
            const startTimeStr = info.startsAt || ev.startsAt;
            
            if (!startTimeStr) continue;

            const startTime = new Date(startTimeStr);
            
            // تحويل الوقت لتوقيت السعودية (KSA) للمقارنة الصحيحة
            const ksaDate = new Date(startTime.getTime() + (3 * 60 * 60 * 1000));
            
            const year = ksaDate.getUTCFullYear();
            const month = String(ksaDate.getUTCMonth() + 1).padStart(2, '0');
            const day = String(ksaDate.getUTCDate()).padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;

            if (dateStr === TARGET_DATE) {
                foundEvents.push({
                    id: ev.id,
                    title: ev.title || "فعالية مجدولة",
                    time: ksaDate.toUTCString().split(' ')[4].substring(0, 5), // وقت تقريبي
                    rawDate: ksaDate
                });
            }
        }

        if (foundEvents.length === 0) {
            console.log(`📭 لم يتم العثور على فعاليات تطابق تاريخ ${TARGET_DATE} في الـ Line-up.`);
        } else {
            // ترتيب حسب الوقت
            foundEvents.sort((a, b) => a.rawDate - b.rawDate);

            console.log(`✅ تم العثور على (${foundEvents.length}) فعالية ليوم ${TARGET_DATE}:\n`);
            
            foundEvents.forEach((ev, i) => {
                // محاولة مطابقة الاسم من القائمة إذا كان العنوان undefined
                const displayTitle = ev.title !== "فعالية مجدولة" ? ev.title : (eventNames[i] || "فعالية");
                
                const hours = ev.rawDate.getUTCHours();
                const minutes = String(ev.rawDate.getUTCMinutes()).padStart(2, '0');
                const ampm = hours >= 12 ? 'PM' : 'AM';
                const displayTime = `${hours % 12 || 12}:${minutes} ${ampm}`;

                console.log(`${i + 1}- 【 ${displayTitle} 】`);
                console.log(`   ⏰ الوقت: ${displayTime}`);
                console.log(`   🆔 ID الفعالية: ${ev.id}`);
                console.log(`-----------------------------------`);
            });
        }
    } catch (err) {
        console.error("❌ خطأ:", err.message);
    }
    process.exit();
});

service.login(process.env.U_MAIL, process.env.U_PASS);

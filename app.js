import 'dotenv/config';
import wolfjs from 'wolf.js';
const { WOLF } = wolfjs;

const service = new WOLF();

const TARGET_GROUP = 9969; 
const TARGET_DATE = "2026-02-20"; 

service.on('ready', async () => {
    console.log(`✅ تم تسجيل الدخول: ${service.currentSubscriber.nickname}`);
    
    try {
        console.log(`📡 جاري سحب بيانات الـ Line-up لـ ${TARGET_GROUP}...`);
        
        const response = await service.websocket.emit('group event list', { 
            id: parseInt(TARGET_GROUP),
            languageId: 1,
            subscribe: true 
        });

        if (!response.success || !response.body) {
            console.log("❌ فشل جلب البيانات من السيرفر.");
            process.exit();
        }

        const rawEvents = response.body;
        console.log(`📊 تم العثور على ${rawEvents.length} فعالية إجمالية. جاري التحليل...`);

        const foundEvents = [];

        for (const ev of rawEvents) {
            // معالجة البيانات للتأكد من أنها ليست undefined
            const title = ev.title || ev.name || "بدون اسم";
            const eventId = ev.id || ev.eventId;
            const startTime = new Date(ev.startsAt || ev.startAt);

            if (isNaN(startTime.getTime())) continue;

            // تنسيق التاريخ للمقارنة (YYYY-MM-DD)
            const year = startTime.getFullYear();
            const month = String(startTime.getMonth() + 1).padStart(2, '0');
            const day = String(startTime.getDate()).padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;

            if (dateStr === TARGET_DATE) {
                foundEvents.push({
                    id: eventId,
                    title: title,
                    time: startTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
                    rawDate: startTime
                });
            }
        }

        if (foundEvents.length === 0) {
            console.log(`📭 لم تطابق أي فعالية تاريخ ${TARGET_DATE}.`);
            console.log("💡 عينة من أول فعالية وجدها البوت (للتحقق من الصيغة):");
            console.log(rawEvents[0]); // طباعة الكائن كاملاً لمعرفة أسماء الحقول الصحيحة
        } else {
            console.log(`✅ تم العثور على (${foundEvents.length}) فعالية:\n`);
            
            foundEvents.sort((a, b) => a.rawDate - b.rawDate).forEach((ev, i) => {
                console.log(`${i + 1}- 【 ${ev.title} 】`);
                console.log(`   ⏰ الوقت: ${ev.time}`);
                console.log(`   🆔 ID: ${ev.id}`);
                console.log(`-----------------------------------`);
            });
        }
    } catch (err) {
        console.error("❌ خطأ بربمجي:", err.message);
    }
    process.exit();
});

service.login(process.env.U_MAIL, process.env.U_PASS);

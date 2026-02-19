import 'dotenv/config';
import wolfjs from 'wolf.js';
const { WOLF } = wolfjs;

const service = new WOLF();

// الإعدادات المستخرجة من صورك
const TARGET_GROUP = 18432094; 
const TARGET_DATE = "2026-02-21"; // التاريخ الظاهر في الصورة الثانية
const TARGET_USER_ID = 80055399; 

const eventNames = [
    "سوالف وافكار", "تحديات", "ساعة تسلية", "شغّل عقلك", "سوالف ونقاشات", "لعب وطرب", 
    "خمن الرقم", "سوالف صباحيه", "تحديات خليجنا ذوق", "تحديات ذهنية", "تحدي التخمين"
];

service.on('ready', async () => {
    console.log(`✅ متصل بـ: ${service.currentSubscriber.nickname}`);
    
    try {
        const response = await service.websocket.emit('group event list', { 
            id: parseInt(TARGET_GROUP),
            languageId: 1,
            subscribe: true 
        });

        if (!response.success) return process.exit();

        const foundEvents = [];
        for (const ev of response.body) {
            // التحقق من صاحب الفعالية (Creator ID)
            if ((ev.subscriberId || ev.creatorId) === TARGET_USER_ID) {
                const info = ev.additionalInfo || {};
                const startTimeStr = info.startsAt || ev.startsAt;
                const endTimeStr = info.endsAt || ev.endsAt;
                
                if (!startTimeStr) continue;

                const startTime = new Date(startTimeStr);
                const endTime = new Date(endTimeStr);
                
                // تحويل لتوقيت السعودية UTC+3 للمطابقة مع الصورة
                const ksaStart = new Date(startTime.getTime() + (3 * 60 * 60 * 1000));
                const dateStr = ksaStart.toISOString().split('T')[0];

                if (dateStr === TARGET_DATE) {
                    const duration = Math.round((endTime - startTime) / 60000);
                    foundEvents.push({ id: ev.id, start: ksaStart, duration });
                }
            }
        }

        console.log(`\n📋 فعاليات العضو (80055399) ليوم (21-02-2026):`);
        console.log("=".repeat(60));

        if (foundEvents.length === 0) {
            console.log("📭 لم يتم العثور على فعاليات. تأكد من توقيت السيرفر.");
        } else {
            foundEvents.sort((a, b) => a.start - b.start).forEach((ev, i) => {
                const h = ev.start.getUTCHours();
                const time = `${h % 12 || 12}:${String(ev.start.getUTCMinutes()).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
                const name = eventNames[i] || "فعالية مجدولة";

                console.log(`${(i + 1).toString().padStart(2, '0')}- 【 ${name} 】`);
                console.log(`   ⏰ وقت البداية: ${time}`);
                console.log(`   ⏳ مدة الفعالية: ${ev.duration} دقيقة`);
                console.log(`   🆔 ID الفعالية: ${ev.id}`);
                console.log("- ".repeat(30));
            });
        }
    } catch (err) {
        console.error("❌ خطأ:", err.message);
    }
    process.exit();
});

service.login(process.env.U_MAIL, process.env.U_PASS);

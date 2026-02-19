import 'dotenv/config';
import wolfjs from 'wolf.js';
const { WOLF } = wolfjs;

const service = new WOLF();

// --- الإعدادات ---
const TARGET_GROUP = 18432094; 
const TARGET_DATE = "2026-02-21"; 
const TARGET_USER_ID = 80055399; // معرف المستخدم المطلوب تصفية فعالياته
// ----------------

const eventNames = [
    "سوالف وافكار", "تحديات", "ساعة تسلية", "شغّل عقلك", "سوالف ونقاشات", "لعب وطرب", 
    "خمن الرقم", "سوالف صباحيه", "تحديات خليجنا ذوق", "تحديات ذهنية", "تحدي التخمين", 
    "صباحيات خليجنا ذوق", "تصادمات رقمية", "جيبها بالثانيه", "سوالف والعاب", "تحدي سهم",
    "فـ الصحيح", "رتب الحروف", "جلسات حوارية", "منوعات", "تحدي كرة", "سوالف خليجنا ذوق",
    "تحديات منوعة", "تحديات رقمية", "ساعه نقاش", "فقرات منوعة", "أرقام الحظ", "تحدي الزمن",
    "سوالف ليل", "تحدي الأرقام", "تحديات بوتات", "صناديق الحظ"
];

const formatTime = (date) => {
    const h = date.getUTCHours();
    const m = String(date.getUTCMinutes()).padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    return `${h % 12 || 12}:${m} ${ampm}`;
};

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
            // إضافة شرط الفلترة حسب الـ Creator ID
            if (ev.creatorId !== TARGET_USER_ID) continue;

            const info = ev.additionalInfo || {};
            const startTimeStr = info.startsAt || ev.startsAt;
            const endTimeStr = info.endsAt || ev.endsAt;
            
            if (!startTimeStr || !endTimeStr) continue;

            const startTime = new Date(startTimeStr);
            const endTime = new Date(endTimeStr);
            
            // توقيت السعودية UTC+3
            const ksaStart = new Date(startTime.getTime() + (3 * 60 * 60 * 1000));
            
            const dateStr = `${ksaStart.getUTCFullYear()}-${String(ksaStart.getUTCMonth() + 1).padStart(2, '0')}-${String(ksaStart.getUTCDate()).padStart(2, '0')}`;

            if (dateStr === TARGET_DATE) {
                const durationMs = endTime.getTime() - startTime.getTime();
                const durationMinutes = Math.round(durationMs / (1000 * 60));

                foundEvents.push({ 
                    id: ev.id, 
                    start: ksaStart,
                    duration: durationMinutes
                });
            }
        }

        foundEvents.sort((a, b) => a.start - b.start);

        console.log(`\n📋 فعاليات المستخدم (${TARGET_USER_ID}) ليوم (${TARGET_DATE}):`);
        console.log("=".repeat(60));

        if (foundEvents.length === 0) {
            console.log("📭 لم يتم العثور على فعاليات لهذا المستخدم في التاريخ المحدد.");
        } else {
            foundEvents.forEach((ev, i) => {
                const name = eventNames[i] || "فعالية إضافية";

                console.log(`${(i + 1).toString().padStart(2, '0')}- 【 ${name.padEnd(20)} 】`);
                console.log(`   ⏰ وقت البداية: ${formatTime(ev.start)}`);
                console.log(`   ⏳ مدة الفعالية: ${ev.duration} دقيقة`);
                console.log(`   🆔 ID: ${ev.id}`);
                console.log("- ".repeat(30));
            });
        }

    } catch (err) {
        console.error("❌ خطأ:", err.message);
    }
    process.exit();
});

service.login(process.env.U_MAIL, process.env.U_PASS);

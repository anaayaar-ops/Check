import 'dotenv/config';
import wolfjs from 'wolf.js';
const { WOLF } = wolfjs;

const service = new WOLF();

// الإعدادات المستخرجة من الصور
const TARGET_GROUP = 18432094; 
const TARGET_USER_ID = 80055399; 

// القائمة الكاملة للأسماء لضمان مطابقة الترتيب
const eventNames = [
    "سوالف وافكار", "تحديات", "ساعة تسلية", "شغّل عقلك", "سوالف ونقاشات", "لعب وطرب", 
    "خمن الرقم", "سوالف صباحيه", "تحديات خليجنا ذوق", "تحديات ذهنية", "تحدي التخمين", 
    "صباحيات خليجنا ذوق", "تصادمات رقمية", "جيبها بالثانيه", "سوالف والعاب", "تحدي سهم",
    "فـ الصحيح", "رتب الحروف", "جلسات حوارية", "منوعات", "تحدي كرة", "سوالف خليجنا ذوق",
    "تحديات منوعة", "تحديات رقمية", "ساعه نقاش", "فقرات منوعة", "أرقام الحظ", "تحدي الزمن",
    "سوالف ليل", "تحدي الأرقام", "تحديات بوتات", "صناديق الحظ"
];

service.on('ready', async () => {
    console.log(`✅ تم تسجيل الدخول: ${service.currentSubscriber.nickname}`);
    
    try {
        const response = await service.websocket.emit('group event list', { 
            id: parseInt(TARGET_GROUP),
            languageId: 1,
            subscribe: true 
        });

        if (!response.success) return process.exit();

        const foundEvents = [];
        
        for (const ev of response.body) {
            // فحص معرف الناشر في أكثر من حقل محتمل
            const creator = ev.subscriberId || ev.creatorId || (ev.additionalInfo && ev.additionalInfo.creatorId);
            
            if (parseInt(creator) === TARGET_USER_ID) {
                const info = ev.additionalInfo || {};
                const startStr = info.startsAt || ev.startsAt;
                const endStr = info.endsAt || ev.endsAt;

                if (!startStr) continue;

                const startDate = new Date(startStr);
                const endDate = new Date(endStr);
                
                // تحويل لتوقيت السعودية UTC+3
                const ksaDate = new Date(startDate.getTime() + (3 * 60 * 60 * 1000));
                const day = ksaDate.getUTCDate();
                const month = ksaDate.getUTCMonth() + 1;

                // البحث في يوم 20 و 21 لضمان جلب فعاليات منتصف الليل
                if (month === 2 && (day === 20 || day === 21)) {
                    const duration = Math.round((endDate - startDate) / 60000);
                    foundEvents.push({ 
                        id: ev.id, 
                        start: ksaDate, 
                        duration,
                        title: ev.title 
                    });
                }
            }
        }

        console.log(`\n📋 تقرير فعاليات العضو (80055399) - الروم: ${TARGET_GROUP}`);
        console.log("=".repeat(65));

        if (foundEvents.length === 0) {
            console.log("📭 لم يتم العثور على فعاليات لهذا المعرف في السيرفر حالياً.");
        } else {
            // ترتيب تصاعدي حسب الوقت
            foundEvents.sort((a, b) => a.start - b.start);

            foundEvents.forEach((ev, i) => {
                const h = ev.start.getUTCHours();
                const m = String(ev.start.getUTCMinutes()).padStart(2, '0');
                const ampm = h >= 12 ? 'PM' : 'AM';
                const time = `${h % 12 || 12}:${m} ${ampm}`;
                const date = `${ev.start.getUTCDate()}/${ev.start.getUTCMonth() + 1}/2026`;
                
                // استخدام الاسم من القائمة بناءً على الترتيب إذا كان العنوان فارغاً
                const name = (ev.title && ev.title !== "فعالية مجدولة") ? ev.title : (eventNames[i] || "فعالية");

                console.log(`${(i + 1).toString().padStart(2, '0')}- 【 ${name.padEnd(20)} 】`);
                console.log(`   ⏰ وقت البداية: ${time.padEnd(8)} | 📅 التاريخ: ${date}`);
                console.log(`   ⏳ مدة الفعالية: ${ev.duration} دقيقة     | 🆔 ID: ${ev.id}`);
                console.log("- ".repeat(32));
            });
            console.log(`🏁 الإجمالي المكتشف: ${foundEvents.length} فعالية.`);
        }

    } catch (err) {
        console.error("❌ خطأ:", err.message);
    }
    process.exit();
});

service.login(process.env.U_MAIL, process.env.U_PASS);

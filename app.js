import 'dotenv/config';
import wolfjs from 'wolf.js';
const { WOLF } = wolfjs;

const service = new WOLF();

// الإعدادات بناءً على الصورة المزودة
const TARGET_GROUP = 9969; 
const TARGET_DATE = "2026-02-20"; 

service.on('ready', async () => {
    console.log(`✅ تم تسجيل الدخول: ${service.currentSubscriber.nickname}`);
    
    try {
        console.log(`📡 جاري سحب بيانات الـ Line-up للروم: ${TARGET_GROUP}...`);
        
        // محاولة جلب الفعاليات بصيغة شاملة
        const response = await service.websocket.emit('group event list', { 
            id: parseInt(TARGET_GROUP),
            languageId: 1,
            subscribe: true // ضروري جداً لرؤية الفعاليات المجدولة
        });

        if (!response.success) {
            console.error("❌ فشل السيرفر في الاستجابة:", response.body);
            process.exit();
        }

        const events = response.body || [];
        
        // تصفية الفعاليات بناءً على يوم 20 فبراير
        const filtered = events.filter(ev => {
            const d = new Date(ev.startsAt);
            return d.getFullYear() === 2026 && (d.getMonth() + 1) === 2 && d.getDate() === 20;
        });

        if (filtered.length === 0) {
            console.log(`⚠️ لم يتم العثور على فعاليات لهذا التاريخ برمجياً.`);
            console.log(`🔎 إجمالي الفعاليات التي رآها البوت في الروم: ${events.length}`);
            if (events.length > 0) {
                console.log("إليك أول فعالية مسجلة في قائمة السيرفر:");
                console.log(`- ${events[0].title} | التاريخ: ${new Date(events[0].startsAt).toLocaleDateString()}`);
            }
        } else {
            console.log(`✅ تم العثور على (${filtered.length}) فعالية في القائمة:\n`);
            
            // ترتيب الفعاليات تصاعدياً حسب الوقت
            filtered.sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt));

            filtered.forEach((ev, i) => {
                const startTime = new Date(ev.startsAt).toLocaleTimeString('en-US', { 
                    hour: '2-digit', 
                    minute: '2-digit', 
                    hour12: true 
                });
                
                console.log(`${i + 1}- 【 ${ev.title} 】`);
                console.log(`   ⏰ الوقت: ${startTime}`);
                console.log(`   🆔 المعرف (ID): ${ev.id}`);
                console.log(`-----------------------------------`);
            });
        }
    } catch (err) {
        console.error("❌ خطأ:", err.message);
    }
    process.exit();
});

service.login(process.env.U_MAIL, process.env.U_PASS);

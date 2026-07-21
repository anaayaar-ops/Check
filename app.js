import 'dotenv/config';
import wolfjs from 'wolf.js';
const { WOLF } = wolfjs;

const service = new WOLF();

const TARGET_GROUP = 18432094;
const TARGET_DATE = "2026-07-22";       // التاريخ المطلوب
const TARGET_MEMBER_ID = 80055399;      // العضوية التي رفعت الفعالية

const formatTime = (date) => {
    const h = date.getUTCHours();
    const m = String(date.getUTCMinutes()).padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    return `${h % 12 || 12}:${m} ${ampm}`;
};

// يحاول إيجاد قيمة أي حقل (حتى لو getter على الـ prototype) بعدة أسماء محتملة
const deepFindId = (obj, keys) => {
    if (!obj) return null;
    // own properties
    for (const k of keys) {
        if (obj[k] !== undefined && obj[k] !== null) return obj[k];
    }
    // prototype getters
    const proto = Object.getPrototypeOf(obj);
    if (proto) {
        for (const propName of Object.getOwnPropertyNames(proto)) {
            if (keys.includes(propName)) {
                try {
                    const val = obj[propName];
                    if (val !== undefined && val !== null) return val;
                } catch (e) {}
            }
        }
    }
    return null;
};

const POSSIBLE_CREATOR_KEYS = [
    'createdBy', 'creatorId', 'ownerId', 'subscriberId',
    'creator', 'owner', 'createdById', 'userId', 'hostId'
];

const getCreatorId = (ev) => {
    const info = ev.additionalInfo || {};
    return (
        deepFindId(ev, POSSIBLE_CREATOR_KEYS) ??
        deepFindId(info, POSSIBLE_CREATOR_KEYS) ??
        null
    );
};

service.on('ready', async () => {
    console.log(`✅ متصل بـ: ${service.currentSubscriber.nickname}`);

    try {
        const response = await service.websocket.emit('group event list', {
            id: parseInt(TARGET_GROUP),
            languageId: 1,
            subscribe: true
        });

        if (!response.success) {
            console.log("❌ فشل جلب قائمة الفعاليات");
            return process.exit();
        }

        // === تشخيص أول فعالية فقط لمعرفة الحقول الحقيقية المتاحة ===
        const sample = response.body[0];
        if (sample) {
            console.log("\n🔍 تشخيص أول فعالية:");
            console.log("own keys:", Object.keys(sample));
            const proto = Object.getPrototypeOf(sample);
            if (proto) {
                console.log("prototype keys:", Object.getOwnPropertyNames(proto));
                for (const key of Object.getOwnPropertyNames(proto)) {
                    if (key === 'constructor') continue;
                    try {
                        const val = sample[key];
                        if (typeof val !== 'function') console.log(`  ${key} =`, val);
                    } catch (e) {}
                }
            }
            console.log("");
        }

        // === تجهيز قائمة الفعاليات في التاريخ المستهدف ===
        const dayEvents = [];
        for (const ev of response.body) {
            const info = ev.additionalInfo || {};
            const startTimeStr = info.startsAt || ev.startsAt;
            if (!startTimeStr) continue;

            const startTime = new Date(startTimeStr);
            const ksaStart = new Date(startTime.getTime() + (3 * 60 * 60 * 1000)); // UTC+3

            const dateStr = `${ksaStart.getUTCFullYear()}-${String(ksaStart.getUTCMonth() + 1).padStart(2, '0')}-${String(ksaStart.getUTCDate()).padStart(2, '0')}`;
            if (dateStr !== TARGET_DATE) continue;

            dayEvents.push({ ev, dateStr, start: ksaStart });
        }

        // === محاولة 1: الحصول على المنشئ مباشرة من كائن الفعالية ===
        let foundEvents = [];
        let unresolvedEvents = [];

        for (const item of dayEvents) {
            const creatorId = getCreatorId(item.ev);
            if (creatorId !== null) {
                if (parseInt(creatorId) === TARGET_MEMBER_ID) {
                    foundEvents.push({ id: item.ev.id, dateStr: item.dateStr, start: item.start });
                }
            } else {
                unresolvedEvents.push(item);
            }
        }

        // === محاولة 2: لو ما قدرنا نحدد المنشئ من الفعالية، نجرب سجل التدقيق ===
        if (unresolvedEvents.length > 0) {
            console.log(`⚠️ لم يتم إيجاد حقل المنشئ في ${unresolvedEvents.length} فعالية، جاري محاولة سجل التدقيق (Audit Log)...`);
            try {
                const auditResponse = await service.websocket.emit('group audit log list', {
                    id: parseInt(TARGET_GROUP),
                    languageId: 1
                });

                if (auditResponse.success && Array.isArray(auditResponse.body)) {
                    // اطبع أول إدخال للتأكد من شكل البيانات
                    if (auditResponse.body[0]) {
                        console.log("\n🔍 عينة من الـ Audit Log:");
                        console.log(JSON.stringify(auditResponse.body[0], null, 2));
                    }

                    // نحاول مطابقة كل فعالية غير محلولة مع سجل التدقيق عبر eventId
                    const unresolvedIds = new Set(unresolvedEvents.map(i => i.ev.id));

                    for (const entry of auditResponse.body) {
                        const eId = entry.eventId ?? entry.additionalInfo?.eventId ?? entry.entityId;
                        const subId = entry.subscriberId ?? entry.userId ?? entry.creatorId;
                        if (eId && unresolvedIds.has(eId) && subId) {
                            if (parseInt(subId) === TARGET_MEMBER_ID) {
                                const match = unresolvedEvents.find(i => i.ev.id === eId);
                                if (match) {
                                    foundEvents.push({ id: match.ev.id, dateStr: match.dateStr, start: match.start });
                                }
                            }
                        }
                    }
                } else {
                    console.log("❌ فشل جلب سجل التدقيق أو تنسيقه غير معروف:", JSON.stringify(auditResponse).slice(0, 500));
                }
            } catch (auditErr) {
                console.log("❌ خطأ أثناء محاولة سجل التدقيق:", auditErr.message);
                console.log("ℹ️ قد يتطلب هذا الأمر صلاحيات أدمن في الكروب، أو أن اسم الحدث websocket مختلف.");
            }
        }

        // === ترتيب وطباعة النتائج ===
        foundEvents.sort((a, b) => a.start - b.start);

        console.log(`\n📋 فعاليات ${TARGET_DATE} المرفوعة من العضوية ${TARGET_MEMBER_ID}:`);
        console.log("=".repeat(60));

        foundEvents.forEach((ev, i) => {
            console.log(`${(i + 1).toString().padStart(2, '0')}- 🆔 ID: ${ev.id}`);
            console.log(`   📅 التاريخ: ${ev.dateStr}`);
            console.log(`   ⏰ الوقت: ${formatTime(ev.start)}`);
            console.log("-".repeat(40));
        });

        console.log(`🏁 إجمالي الفعاليات: ${foundEvents.length}`);

        if (foundEvents.length === 0 && unresolvedEvents.length > 0) {
            console.log(`\n⚠️ ملاحظة: لم نتمكن من تحديد منشئ ${unresolvedEvents.length} فعالية عبر أي من الطريقتين.`);
            console.log("راجع مخرجات التشخيص أعلاه (خصوصًا 'prototype keys' وعينة الـ Audit Log) لتحديد اسم الحقل الصحيح يدويًا.");
        }

    } catch (err) {
        console.error("❌ خطأ:", err.message);
    }
    process.exit();
});

service.login(process.env.U_MAIL, process.env.U_PASS);

import 'dotenv/config';
import wolfjs from 'wolf.js';
const { WOLF } = wolfjs;

const service = new WOLF();
const TARGET_GROUP = 18432094;

service.on('ready', async () => {
    console.log(`✅ متصل بـ: ${service.currentSubscriber.nickname}`);

    // جرّب عدة أسماء أوامر محتملة لجلب تفاصيل فعالية مفردة
    const eventId = 862096; // خذ أي id ظهر عندك سابقًا

    const attempts = [
        { name: 'group event', body: { id: eventId, languageId: 1 } },
        { name: 'group event', body: { eventId, languageId: 1 } },
        { name: 'group event get', body: { id: eventId, languageId: 1 } },
        { name: 'group audit log', body: { id: TARGET_GROUP, languageId: 1 } },
        { name: 'group audit', body: { id: TARGET_GROUP, languageId: 1 } },
    ];

    for (const attempt of attempts) {
        try {
            const res = await service.websocket.emit(attempt.name, attempt.body);
            console.log(`\n--- Command: "${attempt.name}" body: ${JSON.stringify(attempt.body)} ---`);
            console.log("success:", res.success, "code:", res.code);
            console.log(JSON.stringify(res.body, null, 2)?.slice(0, 1000));
        } catch (e) {
            console.log(`\n--- Command: "${attempt.name}" threw error ---`);
            console.log(e.message);
        }
    }

    process.exit();
});

service.login(process.env.U_MAIL, process.env.U_PASS);

// inspect2.js
import fs from 'fs';

const files = [
    'node_modules/wolf.js/src/helper/event/Event.js',
    'node_modules/wolf.js/src/models/Event.js',
    'node_modules/wolf.js/src/models/SubscriberEvent.js',
    'node_modules/wolf.js/src/models/SubscriberEventAdditionalInfo.js',
    'node_modules/wolf.js/src/models/ChannelEventManager.js',
    'node_modules/wolf.js/src/client/websocket/events/group/event/GROUP_EVENT_CREATE.js',
];

for (const f of files) {
    console.log('\n' + '='.repeat(80));
    console.log('📄 ' + f);
    console.log('='.repeat(80));
    console.log(fs.readFileSync(f, 'utf8'));
}

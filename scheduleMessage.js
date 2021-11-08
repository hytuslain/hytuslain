const schedule = require('node-schedule');
const service = require('./databaseService');
const helper = require('./helperFunctions');

const { DateTime } = require('luxon');

/**
* Sends a scheduled message every Sunday to all the channels the bot is in.
*/
async function startScheduling(app) {
    const rule = new schedule.RecurrenceRule();
    rule.tz = 'Etc/UTC';
     rule.dayOfWeek = [1, 2, 3, 4, 5];
     rule.hour = 4;
     rule.minute = 0;
    console.log('Scheduling posts to every public channel the bot is a member of every weekday at hour', rule.hour, rule.tz);
    const job = schedule.scheduleJob(rule, async () => {
        const registrations = await service.getRegistrationsFor(DateTime.now().toISODate());
        let dailyMessage = '';
        if (registrations.length === 0) dailyMessage = 'Kukaan ei ole tänään toimistolla.';
        else if (registrations.length === 1) dailyMessage = 'Tänään toimistolla on:\n';
        else dailyMessage = 'Tänään toimistolla ovat:\n';
        registrations.forEach((user) => {
            dailyMessage += `<@${user}>\n`;
        });
        helper.getMemberChannelIds(app).then((result) => result.forEach((id) => {
            helper.postMessage(app, id, dailyMessage);
        }));
    });
}

module.exports = { startScheduling };

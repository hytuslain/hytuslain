const { DateTime } = require('luxon');

const schedule = require('node-schedule');
const service = require('./databaseService');
const helper = require('./helperFunctions');
const library = require('./responses');

/**
* Sends a scheduled message every weekday to all the channels the bot is in.
*/
async function startScheduling({ app, usergroups }) {
    const rule = new schedule.RecurrenceRule();
    rule.tz = 'Etc/UTC';
    rule.dayOfWeek = [1, 2, 3, 4, 5];
    rule.hour = 4;
    rule.minute = 0;
    // rule.second = [0, 15, 30, 45];
    console.log('Scheduling posts to every public channel the bot is a member of every weekday at hour', rule.hour, rule.tz);
    schedule.scheduleJob(rule, async () => {
        const registrations = await service.getRegistrationsFor(DateTime.now().toISODate());
        const channels = await helper.getMemberChannelIds(app);
        usergroups.getUsergroupsForChannels(channels).forEach(async (obj) => {
            if (obj.usergroup_ids.length === 0) {
                const message = library.registrationList(
                    DateTime.now(),
                    registrations,
                );
                helper.postMessage(app, obj.channel_id, message);
            } else {
                obj.usergroup_ids.forEach(async (usergroupId) => {
                    const message = library.registrationListWithUsergroup(
                        DateTime.now(),
                        registrations.filter(
                            (userId) => usergroups.isUserInUsergroup(userId, usergroupId),
                        ),
                        usergroups.generateMentionString(usergroupId),
                    );
                    helper.postMessage(app, obj.channel_id, message);
                });
            }
        });
    });
}

/**
 * Schedules usergroup readings
 * @param {*} app Slack app instance
 * @param {*} usergroups Usergroup cache instance
 */
const scheduleUsergroupReadings = async ({ app, usergroups }) => {
    const procedure = async () => {
        helper.readUsergroupsFromCleanSlate({ app, usergroups });
    };
    const everyNight = new schedule.RecurrenceRule();
    everyNight.tz = 'Etc/UTC';
    everyNight.hour = 0;
    everyNight.minute = 25;
    console.log(`scheduling nightly usergroup reads at ${everyNight.hour}h ${everyNight.minute}m (${everyNight.tz})`);
    schedule.scheduleJob(everyNight, procedure);
    // also run it _now_
    procedure();
};

module.exports = {
    startScheduling,
    scheduleUsergroupReadings,
};

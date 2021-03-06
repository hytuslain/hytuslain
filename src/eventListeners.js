const home = require('./home');
const scheduleMessage = require('./scheduleMessage');

exports.enableEventListeners = ({ app, usergroups, userCache }) => {
    /**
    * Updates the App-Home page for the specified user when they click on the Home tab.
    */
    app.event('app_home_opened', async ({ event, client }) => {
        home.update(client, event.user);
    });

    /**
     * Event listener for usergroup creation events
     */
    app.event('subteam_created', async ({ event }) => {
        const { id } = event.subteam;
        const { type } = event;
        const ret = usergroups.processCreationEvent(event);
        const shorthand = usergroups.generatePlaintextString(id);
        console.log(`ug ${shorthand} <${id}>: ${type}, returning ${ret}`);
    });

    /**
     * Event listener for usergroup update events
     */
    app.event('subteam_updated', async ({ event }) => {
        const { id } = event.subteam;
        const { type } = event;
        const ret = usergroups.processUpdateEvent(event);
        const shorthand = usergroups.generatePlaintextString(id);
        console.log(`ug ${shorthand} <${id}>: ${type}, returning ${ret}`);
        // The usergroup user-list state can be dirty after an update event,
        // as slack truncates the users-array to 500 elements.
        if (!ret) {
            console.log(`ug ${shorthand} <${id}> is dirty, refreshing users`);
            const users = await app.client.usergroups.users.list({ usergroup: id });
            const res = usergroups.insertUsergroupUsersFromAPIListResponse(users, id);
            if (!res) {
                console.log(`ug ${shorthand} <${id}> remains dirty after failed refresh`);
            }
        }
    });

    /**
     * Event listener for usergroup member change events
     */
    app.event('subteam_members_changed', async ({ event }) => {
        const id = event.subteam_id;
        const { type } = event;
        const ret = usergroups.processMembersChangedEvent(event);
        const shorthand = usergroups.generatePlaintextString(id);
        console.log(`ug ${shorthand} <${id}>: ${type}, returning ${ret}`);
    });

    /**
     * Event listener for channel member join events
     */
    app.event('member_joined_channel', async ({ event }) => {
        try {
            // When the bot joins a channel, a daily message is scheduled for that channel with the default time.
            if (app.client.auth.test.bot_id === event.bot) {
                const channelId = event.channel;
                scheduleMessage.scheduleMessage({
                    channelId,
                    app,
                    usergroups,
                    userCache,
                });
            }
        } catch (error) {
            console.error(error);
        }
    });
};

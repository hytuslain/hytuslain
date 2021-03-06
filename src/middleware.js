const helper = require('./helperFunctions');
const home = require('./home');

exports.enableMiddleware = ({ app, userCache }) => {
    /**
    * Get the restriction/guest value of the given user from Slack API.
    * @param {*} userId
    * @returns True if the user is restricted.
    */
    async function getUserRestriction(userId) {
        const user = await userCache.getCachedUser(userId);
        // if we don't have a successful api call, default to restriction
        if (!user || user.is_restricted === undefined) {
            return true;
        }
        return user.is_restricted;
    }

    /**
    * Bolt global middleware (runs before every request) that checks if the user
    * is a guest (restricted), and if so, stops further processing of the request,
    * displaying an error message instead.
    */
    async function guestHandler({
        payload,
        body,
        client,
        next,
        ack,
        event,
    }) {
        let goodToSkip = false;
        // Whitelist the subteam_* family of events
        if (event && event.type.startsWith('subteam_')) {
            goodToSkip = true;
        }
        if (goodToSkip) {
            console.log('skipping guest check due to whitelisted action');
            await next();
            return;
        }
        // The user ID is found in many different places depending on the type of action taken
        let userId; // Undefined evaluates as false
        if (!userId) try { userId = payload.user; } catch (error) {} // tab
        if (!userId) try { userId = payload.user_id; } catch (error) {} // slash command
        if (!userId) try { userId = body.user.id; } catch (error) {} // button
        if (!userId) try { userId = body.event.message.user; } catch (error) {} // message edit
        // Approve requests which don't include any of the above (couldn't find any)
        if (!userId) {
            console.log('alert: guest check skipped!');
            await next();
            return;
        }
        try {
            if (await getUserRestriction(userId)) {
                throw new Error('User is restricted');
            }
        } catch (error) {
        // This user is restricted. Show them an error message and stop processing the request
            if (error.message === 'User is restricted') {
                if (event !== undefined && (event.channel_type === 'channel' || event.channel_type === 'group')) {
                    // Don't send the error message in this case
                    return;
                }
                // eslint-disable-next-line max-len
                const message = `Pahoittelut, <@${userId}>. Olet vierask??ytt??j?? t??ss?? Slack-ty??tilassa, joten et voi k??ytt???? t??t?? bottia.`;
                if (payload.command !== undefined) { // Responds to a slash-command
                    await ack();
                    helper.postEphemeralMessage(app, payload.channel_id, userId, message);
                } else if (payload.channel === undefined || payload.tab === 'home') { // Shows an error message on the home tab.
                    home.error(client, userId, message);
                } else { // Responds to a private message with an ephemeral message.
                    helper.postEphemeralMessage(app, payload.channel, userId, message);
                }
                return;
            }
            // Pass control to previous middleware (if any) or the global error handler
            throw error;
        }
        // Pass control to the next middleware (if there are any) and the listener functions
        // Note: You probably don't want to call this inside a `try` block, or any middleware
        // after this one that throws will be caught by it.
        await next();
    }

    app.use(guestHandler);
};

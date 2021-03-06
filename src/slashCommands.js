const { DateTime } = require('luxon');

const dfunc = require('./dateFunctions');
const helper = require('./helperFunctions');
const service = require('./databaseService');
const library = require('./responses');
const schedule = require('./scheduleMessage');

/**
 * An optional prefix for our slash-commands. When set to e.g. 'h',
 * '/listaa' becomes '/hlistaa'.
 * This requires manual command configuration on the Slack side of things,
 * as in you must alter the manifest for all the commands we have.
 */
const COMMAND_PREFIX = process.env.COMMAND_PREFIX ? process.env.COMMAND_PREFIX : '';

/**
 * Converts a string to an array of arguments. Drops all unnecessary whitespace in the process.
 *
 * @param {string} text - The text to turn into an array of arguments
 * @returns {Array.<string>} Args
 */
const argify = (text) => {
    if (!text) {
        return [];
    }
    return text
        // replace all tabs with spaces
        .replaceAll('\t', ' ')
        // turn into array
        .split(' ')
        // drop all 'empty' arguments
        .filter((str) => str.trim().length > 0);
};

exports.enableSlashCommands = ({ app, usergroups, userCache }) => {
    /**
    * Checks if user gave 'help' as a parameter to a command.
    * If yes, posts instructions on how to use that command.
    * Returns true, if user asked for help and false otherwise.
    */
    const help = (input, channelId, userId, response) => {
        if (input.trim().toLowerCase() === 'help') {
            helper.postEphemeralMessage(app, channelId, userId, response());
            return true;
        }
        return false;
    };

    /**
    * Checks if user gave at least as many parameters as was expected.
    * If yes, posts instructions on how to use that command.
    */
    const enoughParameters = (limit, parameterCount, channelId, userId, response) => {
        if (parameterCount >= limit) return true;
        helper.postEphemeralMessage(app, channelId, userId, response());
        return false;
    };

    /**
    * Checks the given parameters and arranges them so that date is
    * first and possible usergroup mention is second.
    * After calling this function, what is interpreted as the date is found at index 0
    * and usergroup mention, if such was given, is found at index 1.
    * @param {List} args - List of strings, the parameters from the user.
    */
    const arrangeParameters = (args) => {
        if (args.length === 0) {
            // Ei argumentteja tarkoittaa t??t?? p??iv????.
            args.push('t??n????n');
        } else if (args.length === 1) {
            if (usergroups.parseMentionString(args[0]) !== false) {
                // Ainoa argumentti on usergroup mention ja p??iv?? on t??m?? p??iv??.
                args.push('t??n????n');
                args.reverse();
            }
        }
        if (args.length === 2 && usergroups.parseMentionString(args[0]) !== false) {
            // K??ytt??j?? antoi ensin usergroup mentionin ja sitten p??iv??n.
            args.reverse();
        }
    };

    /**
     * Listens to a slash-command and prints a list of people at the office on the given day.
     */
    app.command(`/${COMMAND_PREFIX}listaa`, async ({ command, ack }) => {
        try {
            await ack();
            const input = command.text;
            const channelId = command.channel_id;
            const userId = command.user_id;
            if (help(input, channelId, userId, library.explainListaa)) return;
            const args = argify(input);
            arrangeParameters(args);
            let response = library.demandDateAndRemindAboutUGName();
            const date = dfunc.parseDate(args[0], DateTime.now());
            if (date.isValid) {
                if (args.length === 2) { // Usergroup mention mukana
                    const ugId = usergroups.parseMentionString(args[1]);
                    if (ugId !== false) {
                        const usergroupFilter = (uid) => usergroups.isUserInUsergroup(uid, ugId);
                        const registrations = (
                            await service.getRegistrationsFor(date.toISODate())
                        ).filter(usergroupFilter);
                        response = library.registrationListWithUsergroup(date,
                            registrations,
                            usergroups.generateMentionString(ugId));
                    }
                } else {
                    const registrations = await service.getRegistrationsFor(date.toISODate());
                    response = library.registrationList(date, registrations);
                }
            }
            helper.postEphemeralMessage(app, channelId, userId, response);
        } catch (errori) {
            console.log('Tapahtui virhe :(');
            console.log(errori);
        }
    });

    /**
    * Listens to a slash-command and registers user for given day.
    * Handles both normal and default registrations.
    */
    app.command(`/${COMMAND_PREFIX}ilmoita`, async ({ command, ack }) => {
        try {
            await ack();
            const input = command.text;
            const channelId = command.channel_id;
            const userId = command.user_id;
            if (help(input, channelId, userId, library.explainIlmoita)) return;
            let response = library.demandDateAndStatus();
            const parameters = argify(input);
            if (!enoughParameters(
                2,
                parameters.length,
                channelId,
                userId,
                library.demandDateAndStatus,
            )) { return; }
            let dateString = parameters[0];
            let status = parameters[1];
            let devault = false;
            if (parameters[0].toLowerCase() === 'def' && parameters.length === 3) {
                [dateString, status, devault] = [parameters[1], parameters[2], true];
            }
            const date = dfunc.parseDate(dateString, DateTime.now());
            if (dfunc.isWeekday(date) && (status === 'toimisto' || status === 'et??')) {
                if (devault) {
                    await service.changeDefaultRegistration(
                        userId,
                        dfunc.getWeekday(date),
                        true,
                        (status === 'toimisto'),
                    );
                    response = library.defaultRegistrationAdded(date, status);
                } else {
                    await service.changeRegistration(userId, date.toISODate(), true, status === 'toimisto');
                    response = library.normalRegistrationAdded(date, status);
                }
            } else if (dfunc.isWeekend(date)) {
                if (devault) response = library.denyDefaultRegistrationForWeekend();
                else response = library.denyNormalRegistrationForWeekend();
            }
            helper.postEphemeralMessage(app, channelId, userId, response);
        } catch (error) {
            console.log('Tapahtui virhe :(');
            console.log(error);
        }
    });

    /**
    * Listens to a slash-command and removes registration for user for the given day.
    * Handles both normal and default registration removals.
    */
    app.command(`/${COMMAND_PREFIX}poista`, async ({ command, ack }) => {
        try {
            await ack();
            const input = command.text;
            const channelId = command.channel_id;
            const userId = command.user_id;
            if (help(input, channelId, userId, library.explainPoista)) return;
            let response = library.demandDate();
            const parameters = argify(input);
            if (!enoughParameters(1, parameters.length, channelId, userId, library.demandDate)) {
                return;
            }
            let dateString = parameters[0];
            let devault = false;
            if (parameters[0].toLowerCase() === 'def' && parameters.length === 2) {
                [dateString, devault] = [parameters[1], true];
            }
            const date = dfunc.parseDate(dateString, DateTime.now());
            if (date.isValid) {
                if (devault) {
                    await service.changeDefaultRegistration(userId, dfunc.getWeekday(date), false);
                    response = library.defaultRegistrationRemoved(date);
                } else {
                    await service.changeRegistration(userId, date.toISODate(), false);
                    response = library.normalRegistrationRemoved(date);
                }
            }
            helper.postEphemeralMessage(app, channelId, userId, response);
        } catch (error) {
            console.log(error);
        }
    });

    /**
    * Listens to a slash-command and changes the time at which the automated message is posted to the current channel.
    */
    app.command(`/${COMMAND_PREFIX}tilaa`, async ({ command, ack }) => {
        try {
            await ack();
            const input = command.text;
            const channelId = command.channel_id;
            const userId = command.user_id;

            // print help before channel membership check
            if (help(input, channelId, userId, library.explainTilaa)) return;

            // check if bot is a member
            const isMember = await helper.isBotChannelMember(app, channelId);
            if (!isMember) {
                helper.postEphemeralMessage(
                    app,
                    channelId,
                    userId,
                    library.subscribeFailedNotInChannel(command.channel_name),
                );
                return;
            }
            let response = library.demandTime();
            const parameters = argify(input);
            if (!enoughParameters(
                1,
                parameters.length,
                channelId,
                userId,
                library.demandTime,
            )) { return; }
            const timeString = parameters[0];
            const time = dfunc.parseTime(timeString);
            if (time.isValid) {
                schedule.scheduleMessage({
                    channelId,
                    time,
                    app,
                    usergroups,
                    userCache,
                });
                response = library.automatedMessageRescheduled(time.setLocale('fi').toLocaleString(DateTime.TIME_24_SIMPLE));
                helper.postMessage(app, channelId, response);
            } else {
                response = library.demandTime();
                helper.postEphemeralMessage(app, channelId, userId, response);
            }
        } catch (error) {
            console.log(error);
        }
    });
};

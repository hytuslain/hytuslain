const assert = require('assert');
const db = require('../src/database');
const controller = require('../src/controllers/db.controllers');

describe('Default signups test', function () { // eslint-disable-line
    this.beforeAll(async () => {
        await db.sequelize.sync({ force: true });
    });

    it('Create a default registration for a user.', async () => {
        const person = await db.Person.create({
            slackId: 'XYZ',
        });
        await db.Defaultsignup.create({
            weekday: 'Maanantai',
            atOffice: true,
            PersonId: person.id,
        });
        const p1 = await db.Person.findByPk(1, {
            include: ['defaultsignups'],
        });
        assert.equal(1, p1.defaultsignups.length);
    });
    
    it('Find all default registrations for a weekday.', async () => {
        const person = await db.Person.create({
            slackId: 'ZZZ',
        });
        await db.Defaultsignup.create({
            weekday: 'Maanantai',
            atOffice: true,
            PersonId: person.id,
        });
        const persons = await controller.getAllDefaultRegistrationsForWeekday('Maanantai');
        assert.equal(2, persons.length);
    });
    
    it('addDefaultRegistrationForUser test', async () => {
        let person = await db.Person.create({
            slackId: 'ABC',
        });
        await controller.addDefaultRegistrationForUser('ABC', 'Tiistai', true);
        person = await db.Person.findByPk(person.id, {
            include: ['defaultsignups'],
        });
        assert.equal(1, person.defaultsignups.length);
    });
    
    it('removeDefaultRegistration test', async () => {
        let signup = await controller.getUsersDefaultRegistrationForWeekday('ABC', 'Tiistai');
        assert.notEqual(undefined, signup);
        await controller.removeDefaultRegistration('ABC', 'Tiistai');
        signup = await controller.getUsersDefaultRegistrationForWeekday('ABC', 'Tiistai');
        assert.equal(undefined, signup);
    });
});

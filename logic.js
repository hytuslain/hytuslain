const db = require('./controllers/db.controllers');

const daysUntilMonday = day => day.getDay() === 0 ? 1 : 8 - day.getDay()

const weekdays = [
  'Maanantai',
  'Tiistai',
  'Keskiviikko',
  'Torstai',
  'Perjantai'
]

const generateNextWeek = day => {
  day = new Date(day)
  day.setDate(day.getDate() + daysUntilMonday(day))
  const result = []
  for (const weekday of weekdays) {
    result.push(`${weekday} ${day.getDate()}.${day.getMonth() + 1}.`)
    day.setDate(day.getDate() + 1)
  }
  return result
}

const generateDateTitle = (date) => {
  const parts = date.split('-')
  const newDate = new Date(parts[0], parts[1] -1, parts[2])
  const weekday = weekdays[newDate.getDay() -1]
  const res = `${weekday} ${newDate.getDate()}.${newDate.getMonth() +1}.`
  return res
}

const generateWeek = (day) => {
  const res = []
  const currDate = new Date(day)
  for (let i = 0; i < 1; i++) {
    dayNumber = currDate.getDay();
    if (dayNumber === 6 || dayNumber === 0) {
      currDate.setDate(currDate.getDate() + 1)
      continue
    }
    var month = ''
    if (currDate.getMonth() < 9) {
      month = `0${currDate.getMonth() + 1}`
    } else {
       month = `${currDate.getMonth() + 1}`
    }
    var dayNum = ''
    if (currDate.getDate() < 10 ) {
      dayNum = `0${currDate.getDate()}`
    } else {
      dayNum = `${currDate.getDate()}`
    }
    res.push(`${currDate.getFullYear()}-${month}-${dayNum}`)
    currDate.setDate(currDate.getDate() + 1)
  }
  return res;
}

const getEnrollmentsFor = async (date) => {
  const dbIds = await db.getAllOfficeSignupsForADate(date)

  const slackIds = []
  if (dbIds.length != 0) {
    for (let i = 0; i < dbIds.length; i++) {
      slackIds.push(await db.getSlackId(dbIds[i]))
    }
  }

  console.log("slackIds for : ", date, slackIds)
  return slackIds
}

const toggleSignup = async (userId, date, atOffice = true) => {
  if (await userInOffice(userId, date, atOffice)) {
    await db.removeSignup(userId, date)
  } else {
    await db.addSignupForUser(userId, date, atOffice)
  }
}

const userInOffice = async (userId, date, atOffice = true) => {
  const enrollment = await db.getOfficeSignupForUserAndDate(userId, date)
  return enrollment && enrollment.at_office === atOffice
}

const userIsRemote = async (userId, date) => {
  return userInOffice(userId, date, false)
}

module.exports = {
  daysUntilMonday,
  generateNextWeek,
  generateDateTitle,
  generateWeek,
  getEnrollmentsFor,
  toggleSignup,
  userInOffice,
  userIsRemote
};

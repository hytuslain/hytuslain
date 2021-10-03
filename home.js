const logic = require('./logic');
const { plain_text, mrkdwn } = require('./blocks/section')
const { header } = require('./blocks/header')
const { actions } = require('./blocks/actions')
const { divider } = require('./blocks/divider')
const { button } = require('./blocks/elements/button')

const update = async (client, userId) => {
  const date = new Date()
  const days = logic.generateWeek(date)
  let dayBlocks = []

  dayBlocks = dayBlocks.concat(
    plain_text(`Tiedot päivitetty ${date.toLocaleString("fi-FI")}`),
    actions([
      button('Päivitä', 'update_click', 'updated')
    ]),
    divider()
  )

  for (let i = 0; i < days.length; i++) {
    const d = days[i]

    dayBlocks = dayBlocks.concat(
      header(logic.generateDateTitle(d))
    )

    const enrollments = await logic.getEnrollmentsFor(d)
    let usersString = enrollments.length === 0 ? "Kukaan ei ole ilmoittautunut toimistolle!" : "Toimistolla aikoo olla:\n"
    enrollments.forEach((user) => {
      usersString += `<@${user}>\n`
    })

    dayBlocks = dayBlocks.concat(
      mrkdwn(usersString),
      plain_text("Oma ilmoittautumiseni:"),
      actions([
        button('Toimistolla', 'toimistolla_click', d, `${await logic.userInOffice(userId, d) ? 'primary' : null}`),
        button('Etänä', 'etana_click', d, `${await logic.userIsRemote(userId, d) ? 'primary' : null}`)
      ]),
      divider()
    )
  }

  const blocks = dayBlocks

  client.views.publish({
    user_id: userId,
    view: {
       type:"home",
       blocks: blocks
    }
  })
}

module.exports = { update }
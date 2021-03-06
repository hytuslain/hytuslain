*** Settings ***
Documentation    Tests to verify message tab functionality for a user with member role
Library    SeleniumLibrary    implicit_wait=10s
Library    Screenshot
Library    ./resources/HelpFunc.py
Resource    ./resources/common.robot
Resource    ./resources/message_tab_res.robot
Resource    ./resources/elements.robot

Suite Setup    common.Open Slack In Browser And Login As User
Suite Teardown    common.Close Test Browser

*** Test Cases ***
Can Open Home Tab
    Maximize Browser Window
    Sleep   2s
    Go To Home Tab

Request List For Saturday By Slash Command
    Go To Message Tab
    Send List Command    la
    ${date}=    Get Date For Message Tab    la
    Element Should Contain    ${latest_message}    Kukaan ei ole toimistolla ${date}

Request List For Sunday By Slash Command
    Go To Message Tab
    Send List Command    su
    ${date}=    Get Date For Message Tab    su
    Element Should Contain    ${latest_message}    Kukaan ei ole toimistolla ${date}

Add And Remove Office Signup By Slash Command
    Go To Message Tab
    ${DATE_SHORT}=    Get Next Workday Short
    Set Suite Variable    ${DATE_SHORT}    ${DATE_SHORT}
    Send Signup Command    ${DATE_SHORT}    toimisto
    ${DATE_LONG}=    Get Next Workday Long
    Set Suite Variable    ${DATE_LONG}    ${DATE_LONG}
    Element Should Contain    ${latest_message}    Ilmoittautuminen lisätty - ${DATE_LONG} toimistolla.
    Send List Command    ${DATE_SHORT}
    Element Should Contain    ${latest_message}    ${DATE_SHORT} toimistolla
    Element Should Contain    ${latest_message}    @Jäsen Testikäyttäjä
    Send Remove Signup Command    ${DATE_SHORT}
    Element Should Contain    ${latest_message}    Ilmoittautuminen poistettu
    Element Should Contain    ${latest_message}    ${DATE_SHORT}
    Send List Command    ${DATE_SHORT}
    Element Should Not Contain    ${latest_message}    @Jäsen Testikäyttäjä

Add And Remove Default Office Signup By Slash Command
    Go To Message Tab
    Send Default Signup Command    ma    toimisto
    Element Should Contain    ${latest_message}    Oletusilmoittautuminen lisätty - maanantaisin toimistolla.
    ${NEXT_MONDAY}=    Get Next Monday
    Set Suite Variable    ${NEXT_MONDAY}    ${NEXT_MONDAY}
    Send List Command    ${NEXT_MONDAY}
    Element Should Contain    ${latest_message}    ${NEXT_MONDAY} toimistolla
    Element Should Contain    ${latest_message}    @Jäsen Testikäyttäjä
    Send Remove Default Signup Command    ma
    Element Should Contain    ${latest_message}    Oletusilmoittautuminen poistettu maanantailta
    Send List Command    ${NEXT_MONDAY}
    Element Should Not Contain    ${latest_message}    @Jäsen Testikäyttäjä

Add Remote Signup By Slash Command
    Go To Message Tab
    Send Signup Command    ${DATE_SHORT}    etä
    Element Should Contain    ${latest_message}    Ilmoittautuminen lisätty - ${DATE_LONG} etänä.
    Send List Command    ${DATE_SHORT}
    Element Should Not Contain    ${latest_message}    @Jäsen Testikäyttäjä

Add Default Remote Signup By Slash Command
    Go To Message Tab
    Send Default Signup Command    ma    etä
    Element Should Contain    ${latest_message}    Oletusilmoittautuminen lisätty - maanantaisin etänä.
    Send List Command    ${NEXT_MONDAY}
    Element Should Not Contain    ${latest_message}    @Jäsen Testikäyttäjä

List Team Member Signups
    Go To Message Tab
    Send Signup Command    ${DATE_SHORT}    toimisto
    Element Should Contain    ${latest_message}    Ilmoittautuminen lisätty - ${DATE_LONG} toimistolla.
    Send List Command With Team    ${DATE_SHORT}    @testgroup 
    Element Should Contain    ${latest_message}    ${DATE_SHORT} tiimistä @testgroup
    Element Should Contain    ${latest_message}    @Jäsen Testikäyttäjä
    Send Remove Signup Command    ${DATE_SHORT}
    Send List Command With Team    ${DATE_SHORT}    @testgroup
    Element Should Not Contain    ${latest_message}    @Jäsen Testikäyttäjä
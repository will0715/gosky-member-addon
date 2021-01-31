;(function () {
  // include project locale properties
  GeckoJS.StringBundle.createBundle(
    'chrome://gosky_member/locale/messages.properties'
  )

  // include viviconnect settings model
  include('chrome://viviconnect/content/models/viviconnect_setting.js')

  // TODO: to jsc
  // include core
  include('chrome://gosky_member/content/gosky_member_settings.js')
  include('chrome://gosky_member/content/gosky_member_http.js')
  include('chrome://gosky_member/content/controllers/main_controller.js')
  include('chrome://gosky_member/content/controllers/gosky_controller.js')
  include('chrome://gosky_member/content/controllers/settings_controller.js')

  // mainWindow register ejournal
  var mainWindow = Components.classes['@mozilla.org/appshell/window-mediator;1']
    .getService(Components.interfaces.nsIWindowMediator)
    .getMostRecentWindow('Vivipos:Main')

  if (mainWindow === window) {
    let GoskyMemberMain = GeckoJS.Controller.getInstanceByName(
      'GoskyMemberMain'
    )
    //do something when vivipos startup
    window.addEventListener(
      'ViviposStartup',
      function () {
        GoskyMemberMain.initial()
      },
      false
    )

    var main = GeckoJS.Controller.getInstanceByName('Main')
    if (main) {
      //do something before ecr's main controller initial
      main.addEventListener('beforeInitial', function () {})

      //do something after ecr's main controller initial
      main.addEventListener('afterInitial', function () {})

      //do something before viviecr restart
      window.addEventListener('unload', function () {}, false)
    }
  }
})()

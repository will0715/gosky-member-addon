;(function () {
  const Cc = Components.classes
  const Ci = Components.interfaces

  var GoskyMemberSettings = (window.GoskyMemberSettings = function () {
    this.name = 'GoskyMemberSettings'
  })

  GoskyMemberSettings.settingFile = 'gosky_member_settings.ini'

  GoskyMemberSettings._settings = false
  /**
   * use ini for settings not database
   */
  GoskyMemberSettings.read = function (refresh) {
    if (!this.isSetting()) return null

    refresh = refresh || false
    if (refresh) GoskyMemberSettings._settings = false
    if (GoskyMemberSettings._settings) return GoskyMemberSettings._settings
    GoskyMemberSettings._settings = {}
    var file = this.getSettingFile() // nsILocalFile
    var iniparser = this.getINIParser(file) // nsIINIParser
    var keysEnum = iniparser.getKeys('main')

    while (keysEnum.hasMore()) {
      var key = keysEnum.getNext()

      var value = iniparser.getString('main', key)
      try {
        GoskyMemberSettings._settings[key] = value.trim()
      } catch (e) {
        GoskyMemberSettings._settings[key] = value
      }
    }
    return GoskyMemberSettings._settings
  }

  GoskyMemberSettings.isSetting = function () {
    var file = GoskyMemberSettings.getSettingFile()

    return file.exists()
  }
  /**
   *
   * @return {nsILocalFile}
   */
  GoskyMemberSettings.getSettingFile = function () {
    var extId = 'gosky_member@vivicloud.net'
    var factoryServicesIni = Cc['@mozilla.org/extensions/manager;1']
      .getService(Ci.nsIExtensionManager)
      .getInstallLocation(extId)
      .getItemFile(extId, 'gosky_member_settings.ini')
    return factoryServicesIni
  }
  GoskyMemberSettings.getINIParser = function (file) {
    var iniparser = Cc['@mozilla.org/xpcom/ini-parser-factory;1']
      .getService(Ci.nsIINIParserFactory)
      .createINIParser(file)
    return iniparser
  }
  /**
   * get ini value
   *
   * @public
   * @static
   * @function
   * @name GoskyMemberSettings.getIniValue
   * @return {Object}
   */
  GoskyMemberSettings.getIniValue = function (section, prop, defaultValue) {
    var iniFile = GoskyMemberSettings.getSettingFile() // nsILocalFile
    if (!iniFile) return defaultValue
    var iniParser = GoskyMemberSettings.getINIParser(iniFile) // nsIINIParser
    try {
      return iniParser.getString(section, prop)
    } catch (e) {
      return defaultValue
    }
  }
})()

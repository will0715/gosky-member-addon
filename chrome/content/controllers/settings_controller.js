;(function () {
  const Cc = Components.classes
  const Ci = Components.interfaces
  const unicodeConverter = Cc[
    '@mozilla.org/intl/scriptableunicodeconverter'
  ].createInstance(Components.interfaces.nsIScriptableUnicodeConverter)

  const __controller__ = {
    name: 'GoskyMemberSettings',

    // initial SyncSettings
    initial: function (warn) {
      let settings = this.readSettings()
      this.Form.unserializeFromObject('settingForm', settings)
    },

    readSettings: function () {
      let settings = {}
      settings = GeckoJS.Configure.read('vivipos.fec.settings.gosky_member')
      return settings
    },

    writeSettings: function (settings) {
      if (!settings) return false
      GeckoJS.Configure.write('vivipos.fec.settings.gosky_member', settings)

      return true
    },

    validateForm: function (data) {
      let obj = this.Form.serializeToObject('settingForm', false)
      data.changed = this.Form.isFormModified('settingForm')
    },

    save: function () {
      let data = {
        cancel: false,
        changed: false,
      }

      $do('validateForm', data, 'GoskyMemberSettings')

      if (data.changed) {
        let topwin = GREUtils.XPCOM.getUsefulService(
          'window-mediator'
        ).getMostRecentWindow(null)
        if (
          GREUtils.Dialog.confirm(
            topwin,
            _('setting_confirm'),
            _('Are you sure you want to save the changes?')
          )
        ) {
          try {
            this.update()
          } catch (e) {
            this.log('WARN', 'Error saving settings to preferences.', e)
          } finally {
            GeckoJS.Observer.notify(null, 'prepare-to-restart', this)
          }

          return true
        } else {
          return false
        }
      } else {
        NotifyUtils.warn(_('Sorry, your changes could not be saved'))
      }

      return !data.cancel
    },

    update: function () {
      let obj = this.Form.serializeToObject('settingForm', false)
      this.Form.unserializeFromObject('settingForm', obj)
      let result = this.writeSettings(obj)
      if (result) {
        OsdUtils.info(_('Your changes have been saved'))
      } else {
        NotifyUtils.warn(_('Sorry, your changes could not be saved'))
      }
    },

    exit: function () {
      if (this.Form.isFormModified('settingForm')) {
        let prompts = Components.classes[
          '@mozilla.org/embedcomp/prompt-service;1'
        ].getService(Components.interfaces.nsIPromptService)
        let check = {
          data: false,
        }
        let flags =
          prompts.BUTTON_POS_0 * prompts.BUTTON_TITLE_IS_STRING +
          prompts.BUTTON_POS_1 * prompts.BUTTON_TITLE_CANCEL +
          prompts.BUTTON_POS_2 * prompts.BUTTON_TITLE_IS_STRING

        let action = prompts.confirmEx(
          this.topmostWindow,
          _('Setting Confirmation'),
          _('Save your changes before exit?'),
          flags,
          _('Save'),
          '',
          _('Discard'),
          null,
          check
        )
        if (action == 1) {
          return
        } else if (action == 0) {
          if (!this.save()) return
        }
      }
      window.close()
    },
  }

  GeckoJS.Controller.extend(__controller__)
})()

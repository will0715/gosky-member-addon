;(function () {
  if (typeof AppController === 'undefined') {
    include('chrome://viviecr/content/controllers/app_controller.js')
  }

  var mainWindow = Components.classes['@mozilla.org/appshell/window-mediator;1']
    .getService(Components.interfaces.nsIWindowMediator)
    .getMostRecentWindow('Vivipos:Main')
  var extMgr = Components.classes[
    '@mozilla.org/extensions/manager;1'
  ].getService(Components.interfaces.nsIExtensionManager)
  var extItem = extMgr.getItemForID('viviecr@firich.com.tw')

  const __controller__ = {
    name: 'GoskyMemberMain',
    packageName: 'gosky_member',
    serviceName: 'gosky_member',
    components: ['Acl'],
    uses: ['ShiftMarker'],
    _cartController: null,
    settings: {},

    initial: function () {
      var cart = mainWindow.GeckoJS.Controller.getInstanceByName('Cart')
      if (cart) {
        cart.addEventListener('beforeSubmit', this.beforeSubmit, this)
        cart.addEventListener('confirmVoidSale', this.voidSale, this)
        cart.addEventListener('afterVoidItem', this.afterVoidItem, this)
      }

      this.setUpSevice()
    },
    /**
     * Setup service.
     */
    setUpSevice: function () {
      //setup settings
      let settings = GoskyMemberSettings.read(true)
      this.settings = settings
      GoskyMemberHttpService.load(settings)

      const clientId = GeckoJS.Configure.read(
        'vivipos.fec.settings.gosky_member.client_id'
      )
      const clientSecret = GeckoJS.Configure.read(
        'vivipos.fec.settings.gosky_member.client_secret'
      )

      GoskyMemberHttpService.setClient(clientId, clientSecret)
    },

    queryMemberDialog: function () {
      var mainWindow = (window.mainWindow = Components.classes[
        '@mozilla.org/appshell/window-mediator;1'
      ]
        .getService(Components.interfaces.nsIWindowMediator)
        .getMostRecentWindow('Vivipos:Main'))
      var aFeatures =
        'chrome,titlebar,toolbar,left=112,top=167,modal,width=' +
        760 +
        ',height=' +
        300
      var aURL =
        'chrome://' + this.packageName + '/content/dialogs/member_dialog.xul'

      var inputObj = {
        qrcode: null,
      }
      try {
        GREUtils.Dialog.openWindow(
          this.topmostWindow,
          aURL,
          '',
          aFeatures,
          inputObj
        )
        if (inputObj.ok && inputObj.qrcode) {
          this.queryMemberProcess(inputObj.qrcode)
        }
      } catch (e) {
        this.log('ERROR', 'Window Open Error', e)
      }
    },

    qrcodeDialog: function () {
      var mainWindow = (window.mainWindow = Components.classes[
        '@mozilla.org/appshell/window-mediator;1'
      ]
        .getService(Components.interfaces.nsIWindowMediator)
        .getMostRecentWindow('Vivipos:Main'))
      var aFeatures =
        'chrome,titlebar,toolbar,left=112,top=167,modal,width=' +
        760 +
        ',height=' +
        300
      var aURL =
        'chrome://' + this.packageName + '/content/dialogs/qrcode_dialog.xul'

      let curTransaction = this._getTransaction()

      let remainTotal =
        curTransaction != null ? curTransaction.getRemainTotal() : 0
      let transactionSeq =
        curTransaction != null ? curTransaction.data.seq : null
      if (remainTotal <= 0) {
        NotifyUtils.info(
          _('Transaction amount is lower than 0, please check amount')
        )
        return
      }
      if (!transactionSeq) {
        NotifyUtils.info(_('Data error, please contact technical support'))
        return
      }

      if (this.alreadyUseGoskyPromotion(curTransaction.data)) {
        NotifyUtils.info(_('Already use Gosky promotion'))
        return
      }

      var inputObj = {
        code: null,
      }
      try {
        GREUtils.Dialog.openWindow(
          this.topmostWindow,
          aURL,
          '',
          aFeatures,
          inputObj
        )
        if (inputObj.ok && inputObj.code) {
          this.useQRCodeProcess(inputObj.code)
        }
      } catch (e) {
        this.log('ERROR', 'Window Open Error', e)
      }
    },

    promotionDialog: function () {
      var mainWindow = (window.mainWindow = Components.classes[
        '@mozilla.org/appshell/window-mediator;1'
      ]
        .getService(Components.interfaces.nsIWindowMediator)
        .getMostRecentWindow('Vivipos:Main'))
      var aFeatures =
        'chrome,titlebar,toolbar,left=112,top=167,modal,width=' +
        760 +
        ',height=' +
        300
      var aURL =
        'chrome://' + this.packageName + '/content/dialogs/promotion_dialog.xul'

      let curTransaction = this._getTransaction()

      let remainTotal =
        curTransaction != null ? curTransaction.getRemainTotal() : 0
      let transactionSeq =
        curTransaction != null ? curTransaction.data.seq : null
      if (remainTotal <= 0) {
        NotifyUtils.info(
          _('Transaction amount is lower than 0, please check amount')
        )
        return
      }
      if (!transactionSeq) {
        NotifyUtils.info(_('Data error, please contact technical support'))
        return
      }

      if (this.alreadyUseGoskyPromotion(curTransaction.data)) {
        NotifyUtils.info(_('Already use Gosky promotion'))
        return
      }

      var inputObj = {
        num: 0,
      }
      try {
        GREUtils.Dialog.openWindow(
          this.topmostWindow,
          aURL,
          '',
          aFeatures,
          inputObj
        )
        if (inputObj.ok && inputObj.num) {
          this.usePromotionProcess(inputObj.num)
        }
      } catch (e) {
        this.log('ERROR', 'Window Open Error', e)
      }
    },

    afterQueryMember: function (memberData) {
      const curTransaction = this._getTransaction()
      curTransaction.data.gosky_member = {
        memberData: memberData,
      }
      // TODO: 顯示會員資訊 ---------------------------

      // ----------------------------------------------
      this.dispatchEvent('afterQueryMember', {
        code: qrcode,
        memberData: memberData.data,
      })
    },

    queryMemberProcess: function (qrcode) {
      const goskyMemberController = GeckoJS.Controller.getInstanceByName(
        'GoskyMember'
      )
      let waitPanel = this._showWaitPanel(_('Query Member is porcessing...'))

      try {
        // 取得會員資訊
        const memberData = goskyMemberController.queryMember(qrcode)

        this.log('WARN', memberData)

        this.afterQueryMember(memberData)

        this.sleep(2000)
      } catch (e) {
        this.log('WARN', 'Query Member Process Error', e)
        this._setWaitDescription(_(e.message))
        this.sleep(2000)
      } finally {
        if (waitPanel) {
          waitPanel.hidePopup()
        }
      }
    },

    // 4-1 帶入會員與使用優惠劵
    useQRCodeProcess: function (code) {
      const curTransaction = this._getCartController()._getTransaction()
      const goskyMemberController = this._getGoskyController()
      let waitPanel = this._showWaitPanel(_('Gosky Coupon is porcessing...'))

      try {
        // 掃碼取得促銷內容
        const data = goskyMemberController.useQRCode(code)
        const memberData = data.member
        const discountData = data.discount
        const appliedData = data.applied

        // 處理帶入會員
        if (memberData) {
          this.afterQueryMember(memberData)
        }

        let discount = null
        // 處理促銷
        if (discountData) {
          discount = goskyMemberController.discountProcess(discountData)
        }

        this.log('WARN', discount)

        curTransaction.data.gosky_promotion = {
          discountData: discountData,
          appliedData: appliedData,
          discount: discount,
        }

        this._setWaitDescription(
          _('Use Gosky Coupon success. Discount - %S', [discount || 0])
        )
        this.sleep(2000)
      } catch (e) {
        this.log('WARN', 'Coupon Promotion Process Error', e)
        this._setWaitDescription(_(e.message))
        this.sleep(2000)
      } finally {
        if (waitPanel) {
          waitPanel.hidePopup()
        }
      }
    },

    // 4-2 使用兌點
    // TODO: not validate
    usePromotionProcess: function (num) {
      const curTransaction = this._getCartController()._getTransaction()
      const goskyMemberController = this._getGoskyController()
      let waitPanel = this._showWaitPanel(_('Gosky Promotion is porcessing...'))

      try {
        // 掃碼取得促銷內容
        const data = goskyMemberController.usePromotion(num)
        const appliedData = data.applied

        this.log('WARN', discount)

        curTransaction.data.gosky_promotion = {
          appliedData: appliedData,
        }

        this._setWaitDescription(
          _('Use Gosky Promotion success. Discount - %S', [discount || 0])
        )
        this.sleep(2000)
      } catch (e) {
        this.log('WARN', 'Coupon Promotion Process Error', e)
        this._setWaitDescription(_(e.message))
        this.sleep(2000)
      } finally {
        if (waitPanel) {
          waitPanel.hidePopup()
        }
      }
    },

    // 5 上傳交易
    beforeSubmit: function (event) {
      const curTransaction = this._getCartController()._getTransaction()
      const transactionData = curTransaction.data
      const goskyMemberController = this._getGoskyController()

      if (!this.hasUseGoskyMember(transactionData)) {
        return
      }

      try {
        // 上傳交易
        let orderData = goskyMemberController.newOrder(transactionData)
        // TODO: 上傳交易成功後的動作
        // 顯示會員點數資訊

        this.log('DEBUG', 'Upload Gosky Member Transaction Done')
      } catch (e) {
        // TODO: 上傳交易失敗後的動作
        NotifyUtils.info(_('%S', [e.message]))
        this.log('WARN', 'Upload Gosky Member Error', e)
      }
    },

    // 6 作廢交易
    voidSale: function (evt) {
      const curTransaction = this._getCartController()._getTransaction()
      const transactionData = curTransaction.data
      const goskyMemberController = this._getGoskyController()

      let transactionId = curTransaction != null ? transactionData.id : null
      let transactionSeq = curTransaction != null ? transactionData.seq : null

      if (!transactionId) {
        NotifyUtils.info(_('Data error, please contact technical support'))
        return evt.preventDefault()
      }
      if (!transactionSeq) {
        NotifyUtils.info(_('Data error, please contact technical support'))
        return evt.preventDefault()
      }

      if (!this.hasUseGoskyMember(transactionData)) {
        return
      }

      try {
        // 作廢
        let response = goskyMemberController.voidOrder(transactionData)
        // TODO: 作廢成功後的動作

        // 顯示作廢成功或會員點數資訊

        this.log('DEBUG', 'Void Gosky Member Transaction Done')
      } catch (e) {
        // TODO: 做廢失敗後的動作
        NotifyUtils.info(_('%S', [e.message]))
        this.log('WARN', 'Void Gosky Member Transaction Error', e)
      }
    },

    afterVoidItem: function (event) {
      const curTransaction = this._getCartController()._getTransaction()
      const goskyMemberController = this._getGoskyController()

      const name = event.data[1].name
      const isGoskyDiscount = goskyMemberController.isDiscountGosky(name)

      if (isGoskyDiscount) {
        curTransaction.data.gosky_promotion = null
      }
    },

    alreadyUseGoskyPromotion: function (transactionData) {
      const goskyPromotionData = transactionData.gosky_promotion
      return goskyPromotionData
    },

    hasUseGoskyMember: function (transactionData) {
      const goskyMemberData = transactionData.gosky_member
      return goskyMemberData
    },

    _getErrorMsg: function (result) {
      if (!result) return ''
      let errorMsg = _(result['Message'])
      return errorMsg
    },

    // Get the cart controller
    _getCartController: function () {
      if (!this._cartController) {
        var mainWindow = Components.classes[
          '@mozilla.org/appshell/window-mediator;1'
        ]
          .getService(Components.interfaces.nsIWindowMediator)
          .getMostRecentWindow('Vivipos:Main')
        this._cartController = mainWindow.GeckoJS.Controller.getInstanceByName(
          'Cart'
        )
      }
      return this._cartController
    },

    // Get the transaction
    _getTransaction: function () {
      return this._getCartController()._getTransaction()
    },

    // Get the transaction
    _getGoskyController: function () {
      return GeckoJS.Controller.getInstanceByName('GoskyMember')
    },

    // Get the formula management controller
    _getGoskyMemberMainController: function () {
      if (!this._goskyMemberMainController) {
        var mainWindow = Components.classes[
          '@mozilla.org/appshell/window-mediator;1'
        ]
          .getService(Components.interfaces.nsIWindowMediator)
          .getMostRecentWindow('Vivipos:Main')
        this._goskyMemberMainController = mainWindow.GeckoJS.Controller.getInstanceByName(
          'GoskyMemberMain'
        )
      }
      return this._goskyMemberMainController
    },

    /**
     * show wait panel
     *
     * @param {String} description
     */
    _showWaitPanel: function (description) {
      let caption = document.getElementById('wait_caption')
      if (caption) caption.label = description

      // hide progress bar
      let progress = document.getElementById('progress')
      if (progress) progress.setAttribute('hidden', true)

      let waitPanel = document.getElementById('wait_panel')
      if (waitPanel) waitPanel.openPopupAtScreen(0, 0)

      // release CPU for progressbar ...
      this.sleep(100)

      return waitPanel
    },
    /**
     * set wait description.
     *
     * @param {String}
     */
    _setWaitDescription: function (description) {
      let caption = document.getElementById('wait_caption')
      if (caption) caption.setAttribute('label', description)
    },
  }

  GeckoJS.Controller.extend(__controller__)
})()

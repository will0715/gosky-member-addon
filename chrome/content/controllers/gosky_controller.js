;(function () {
  var __controller__ = {
    name: 'GoskyMember',
    promotionName: 'Gosky Discount',
    discountName: {
      amountDiscount: 'gosky_amount_discount',
      percentOff: 'gosky_percent_off',
      specificPercentOff: 'gosky_specific_percent_off',
      minPriceAmountDiscount: 'gosky_min_price_amount_discount',
    },
    SUCCESS_CODE: '20000',

    /**
     * Get member by qrcode.
     *
     * @param {string} token - QRCode Token
     * @returns {Object|null}
     */
    queryMemberAPI: function (token) {
      let response = GoskyMemberHttpService.api(
        'GET',
        '/api/pos/v1/liketea/user',
        {
          qr_token: token,
        },
        false
      )

      return response
    },

    /**
     * Use QRCode.
     *
     * @param {string} code - QRCode
     * @returns {Object|null}
     */
    useQRCodeAPI: function (code) {
      let response = GoskyMemberHttpService.api(
        'POST',
        '/api/pos/v1/liketea/qr_discont_trial',
        {
          qr_token: code,
        },
        false
      )

      return response
    },

    /**
     * Use Promotion.
     *
     * @param {string} memberId - Member ID
     * @param {string} code - QRCode
     * @returns {Object|null}
     */
    usePromotionAPI: function (memberId, applied) {
      let response = GoskyMemberHttpService.api(
        'POST',
        '/api/pos/v1/liketea/qr_discont_trial',
        {
          user_chatfuel_fbid: memberId,
          applied: applied,
        },
        false
      )

      return response
    },

    /**
     * Get coupon promotion.
     *
     * @param {string} barcode - coupon barcode
     * @returns {Object|null}
     */
    newOrderAPI: function (payload) {
      let response = GoskyMemberHttpService.api(
        'POST',
        '/api/pos/v1/liketea/order',
        payload,
        false
      )

      return response
    },

    /**
     * Consume Coupon.
     *
     * @param {string} barcode - coupon barcode
     * @param {string} memberPhone - member phone
     * @returns {Object|null}
     */
    voidOrderAPI: function (orderId, dateTime) {
      let response = GoskyMemberHttpService.api(
        'DELETE',
        '/api/pos/v1/liketea/order',
        {
          order_id: orderId,
          occur_at: dateTime,
        },
        false
      )

      return response
    },

    isDiscountGosky: function (name) {
      return (
        GeckoJS.BaseObject.getValues(this.discountName).indexOf(name) !== -1
      )
    },

    getItemSinglePrice: function (transactionItem) {
      return (
        transactionItem.current_price +
        transactionItem.current_condiment / transactionItem.current_qty
      )
    },

    getOrderId: function (transactionData) {
      return this._getBranchId() + transactionData.seq + transactionData.created
    },

    // 1 帶入會員
    queryMember: function (token) {
      // 取得API
      const response = this.queryMemberAPI(token)
      // API失敗
      if (!response) {
        throw new Error(
          'Connection timeout! Can not use Gosky system, please check the internet connection.'
        )
      }
      // API業務失敗
      if (response.code !== this.SUCCESS_CODE) {
        throw new Error(response.message)
      }

      const memberData = response.data.token_result.user

      return memberData
    },

    // 4-1 使用優惠劵
    useQRCode: function (code) {
      // 取得API
      const response = this.useQRCodeAPI(code)
      // API失敗
      if (!response) {
        throw new Error(
          'Connection timeout! Can not use Gosky system, please check the internet connection.'
        )
      }
      // API業務失敗
      if (response.code !== this.SUCCESS_CODE) {
        throw new Error(response.message)
      }

      const memberData = response.data.token_result.user
      const discountData = response.data.token_result.reduction
      const appliedData = response.data.applied

      return {
        member: memberData,
        discount: discountData,
        applied: appliedData,
      }
    },

    // 4-2 使用兌點
    // TODO: not validate
    usePromotion: function (memberId, appliedData, num) {
      const applied = this._makeAppliedData(appliedData, num)
      // 取得API
      const response = this.usePromotionAPI(memberId, applied)
      // API失敗
      if (!response) {
        throw new Error(
          'Connection timeout! Can not use Gosky system, please check the internet connection.'
        )
      }
      // API業務失敗
      if (response.code !== this.SUCCESS_CODE) {
        throw new Error(response.message)
      }
      const appliedData = response.data.applied

      return {
        applied: appliedData,
      }
    },

    // 5 新增交易
    newOrder: function (transactionData) {
      this.log('DEBUG', transactionData)
      const orderId = transactionData.getOrderId()

      const goskyMemberData = transactionData.gosky_member
      const memberData = goskyMemberData.memberData
      const discountData = goskyMemberData.discountData
      const appliedData = goskyMemberData.appliedData

      // TODO: make order data
      const orderData = {
        user_chatfuel_fbid: goskyMemberData.info.user_chatfuel_fbid,
        order_id: orderId,
        occur_at: this._getCurrentDateTime(),
        order_price: transactionData.total,
        order_detail: this._makeOrderDetails(),
        applied: appliedData,
      }

      const response = this.newOrderAPI(orderData)
      // API失敗
      if (!response) {
        throw new Error(
          'Connection timeout! Can not use Gosky system, please check the internet connection.'
        )
      }
      // API業務失敗
      if (response.code !== this.SUCCESS_CODE) {
        throw new Error(response.message)
      }

      return response
    },

    // 6 作廢
    voidOrder: function (transactionData) {
      const orderId = transactionData.getOrderId()
      const response = this.voidOrderAPI(orderId, this._getCurrentDateTime())
      // API失敗
      if (!response) {
        throw new Error(
          'Connection timeout! Can not use Gosky system, please check the internet connection.'
        )
      }
      // API業務失敗
      if (response.code !== this.SUCCESS_CODE) {
        throw new Error(response.message)
      }
      return response
    },

    discountProcess: function (discountData) {
      let cart = GeckoJS.Controller.getInstanceByName('Cart')
      this.log('DEBUG', 'Promotion Data', discountData)
      let totalDiscount = 0

      switch (discountData.ruleType) {
        case ':::percent_off':
          totalDiscount = this.processPercentOffDiscount(discountData)
          break
        case ':::amount':
          totalDiscount = this.processAmountDiscount(discountData)
          break
        case '::any:percent_off':
          totalDiscount = this.processSpecificPercentOffDiscount(discountData)
          break
        case ':min_price::amount':
          totalDiscount = this.processMinPriceAmountDiscount(discountData)
          break
        default:
      }

      return totalDiscount
    },

    // 百分比折扣
    processPercentOffDiscount: function (discountData) {
      let cart = GeckoJS.Controller.getInstanceByName('Cart')

      const discount = discountData.discount_content_value

      cart.addMarker('subtotal')
      cart._addDiscount(discount, '%', 'gosky_percent_off')

      this.log('DEBUG', 'Percentage Discount: ' + discount + '%')
      return discount
    },

    // 固定金額折扣
    processAmountDiscount: function (discountData) {
      let cart = GeckoJS.Controller.getInstanceByName('Cart')

      const discount = discountData.discount_content_value

      cart.addMarker('subtotal')
      cart._addDiscount(discount, '$', 'gosky_amount_discount')

      this.log('DEBUG', 'Amount Discount: ' + discount + '$')
      return discount
    },

    // 指定品項折扣
    processSpecificPercentOffDiscount: function (discountData) {
      let cart = GeckoJS.Controller.getInstanceByName('Cart')
      let curTransaction = cart._getTransaction()

      const itemFreeCount = 1
      const itemFreePercentage = discountData.discount_content_value

      const selectIndex = cart._cartView.getSelectedIndex()
      const itemTrans = curTransaction.getItemAt(selectIndex)

      const itemSinglePrice = this.getItemSinglePrice(itemTrans)

      const discount =
        itemSinglePrice * itemFreeCount * (itemFreePercentage / 100)

      cart._addDiscount(discount, '$', 'gosky_specific_percent_off')
      this.log('DEBUG', 'Specific Percent Off: ' + discount + '$')
      return discount
    },

    // 滿x送y
    processMinPriceAmountDiscount: function (discountData) {
      const self = this
      let cart = GeckoJS.Controller.getInstanceByName('Cart')
      let curTransaction = cart._getTransaction()

      const conditionType = discountData.condition_content_type
      const conditionValue = discountData.condition_content_value
      const discount = discountData.discount_content_value

      const transactionTotal = curTransaction.data.total

      // 品項數是否達標
      if (conditionValue > transactionTotal) {
        throw new Error('transaction total not enough')
      }

      cart.addMarker('subtotal')
      cart._addDiscount(discount, '$', 'gosky_min_price_amount_discount')

      this.log('DEBUG', 'Min price amount discount: ' + discount + '$')
      return discount
    },

    _makeAppliedData: function (appliedData, num) {
      return
    },

    // 生成order details
    _makeOrderDetails: function (transactionData) {
      const items = []
      const transactionItems = GeckoJS.BaseObject.getValues(
        transactionData.items
      )

      for (let index = 0; index < transactionItems.length; index++) {
        const transactionItem = transactionItems[index]
        items.push(_makeOrderItem(transactionItem))
      }

      const discountData = transactionData.gosky_promotion.discountData

      return {
        id: transactionData.id,
        seq: transactionData.seq,
        branch: transactionData.branch,
        branch_id: transactionData.branch_id,
        terminal_no: transactionData.terminal_no,
        subtotal: transactionData.subtotal,
        total: transactionData.item_subtotal,
        qty_subtotal: transactionData.qty_subtotal,
        discount_subtotal: transactionData.discount_subtotal,
        items: items,
        SMRS_discount: {
          type: discountData.type,
          id: uuid,
        },
      }
    },

    _makeOrderItem: function (item) {
      const condiments = []
      const itemCondiments = GeckoJS.BaseObject.getValues(item.condiments)
      for (let index = 0; index < itemCondiments.length; index++) {
        const itemCondiment = itemCondiments[index]
        condiments.push(_makeOrderItemCondiment(itemCondiment))
      }

      return {
        no: item.no,
        name: item.name,
        current_qty: item.current_qty,
        current_price: item.current_price,
        current_discount: item.current_discount,
        discount_name: item.discount_name,
        condiment: condiments,
      }
    },

    _makeOrderItemCondiment: function (condiment) {
      return {
        condiment_id: condiment.id,
        name: condiment.name,
        price: condiment.price,
      }
    },

    _getCartlist: function () {
      return document.getElementById('cartList')
    },

    _getCartController: function () {
      return GeckoJS.Controller.getInstanceByName('Cart')
    },

    _getCurrentTransaction: function () {
      return this._getCartController()._getTransaction()
    },

    _getCurrentDateTime: function () {
      return new Date().toString('yyyy-MM-dd HH:mm:ss')
    },

    _getBranchId: function () {
      const storeContact = GeckoJS.Session.get('storeContact')
      return storeContact.branch_id
    },

    destroy: function () {},
  }

  AppController.extend(__controller__)
})()

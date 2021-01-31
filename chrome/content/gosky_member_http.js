;(function () {
  var __class__ = (function () {
    const ClassName = 'GoskyMemberHttpService'
    const ReqTimeout = 15

    function encryptAuthentication(data) {
      return (
        data.method.toLowerCase() +
        ',' +
        data.reqPath +
        ',' +
        data.requestTime +
        ',' +
        data.user_chatfuel_fbid +
        ',' +
        data.qr_token +
        ',' +
        data.order_id +
        ',' +
        JSON.stringify(data.applied)
      )
    }

    function encodeRequestData(data) {
      var result = ''
      // use encodeComponentURI
      if (typeof data == 'object') {
        result = GeckoJS.String.httpBuildQuery(data)
      } else {
        result = encodeURIComponent(data)
      }

      return result
    }

    function parseResponseText(text) {
      // always json format
      var fn = JSON.parse || GeckoJS.BaseObject.unserialize
      var result = null

      try {
        result = fn.call(this, text)
      } catch (e) {
        result = null
      }

      return result
    }

    function getCurrentDateTime() {
      return new Date().getTime()
    }

    function requestApi(
      method,
      reqUrl,
      data,
      async,
      callback,
      raw,
      othersData
    ) {
      method = method || 'GET'

      callback = typeof callback == 'function' ? callback : null
      // set this reference to self for callback
      var self = GoskyMemberHttpService

      // for use asynchronize mode like synchronize mode
      // mozilla only
      var reqStatus = {}
      reqStatus.finish = false
      reqStatus.callbacked = false

      var req = new XMLHttpRequest()

      req.mozBackgroundRequest = true

      /* Request Timeout guard */
      var timeoutSec = 0

      var timeoutSec = ReqTimeout * 1000

      var timeout = setTimeout(function () {
        try {
          GeckoJS.BaseObject.log(
            ClassName,
            'WARN',
            'GoskyMemberHttpService.requestApi  timeout, call req.abort'
          )
          req.abort()
        } catch (e) {
          GeckoJS.BaseObject.log(
            ClassName,
            'ERROR',
            'GoskyMemberHttpService.requestApi timeout exception ',
            e
          )
        }
      }, timeoutSec)

      /* Start Request with http basic authorization */

      var request_data = null
      if (data) {
        request_data = encodeRequestData(data)

        if (method == 'GET') {
          reqUrl += '?' + request_data
          request_data = null
        }
      }

      GeckoJS.BaseObject.log(ClassName, 'DEBUG', reqUrl)

      // before request , notify observers
      GeckoJS.Observer.notify(null, 'formula-management-request-service', self)

      var datas = null // response datas

      req.open(method, reqUrl, true)

      // Set header so the called script knows that it's an XMLHttpRequest
      req.setRequestHeader('X-Requested-With', 'XMLHttpRequest')

      // Auth
      const requestTime = getCurrentDateTime()
      req.setRequestHeader('AuthTime', requestTime)
      req.setRequestHeader('AuthClientId', othersData.clientId)
      req.setRequestHeader(
        'AuthSignature',
        encryptAuthentication({
          method: method,
          path: othersData.reqPath,
          requestTime: requestTime,
          user_chatfuel_fbid: data.user_chatfuel_fbid,
          qr_token: data.qr_token,
          order_id: data.order_id,
          applied: data.applied,
        })
      )

      // reset status
      self.lastReadyState = 0
      self.lastStatus = 0
      self.lastErrorMessage = ''

      // set readystatechange handler
      req.onreadystatechange = function (aEvt) {
        self.lastReadyState = req.readyState

        if (req.readyState == 4) {
          self.lastStatus = req.status
          reqStatus.finish = true

          try {
            if (req.status != 0) {
              if (raw) {
                datas = req.responseText
              } else {
                datas = parseResponseText(req.responseText)
              }
            }

            GeckoJS.BaseObject.log(
              ClassName,
              'DEBUG',
              'requestService response:' + req.responseText
            )

            if (async) {
              // status 0 -- timeout
              if (callback) {
                try {
                  if (reqStatus && !reqStatus.callbacked) {
                    reqStatus.callbacked = true
                    callback.call(self, datas)
                  }
                } catch (e) {
                  GeckoJS.BaseObject.log(
                    ClassName,
                    'ERROR',
                    'callback error ',
                    e
                  )
                }
              }
              // clear resources
              if (timeout) clearTimeout(timeout)
              if (req) delete req
              if (reqStatus) delete reqStatus
            }
          } catch (e) {
            GeckoJS.BaseObject.log(
              ClassName,
              'ERROR',
              'requestService onreadystatechange error',
              e
            )
          }
        }
      }

      try {
        // Bypassing the cache
        req.channel.loadFlags |=
          Components.interfaces.nsIRequest.LOAD_BYPASS_CACHE
        if (request_data)
          req.setRequestHeader('Content-Type', 'application/json')
        req.send(request_data)

        if (!async) {
          // block ui until request finish or timeout

          var now = new Date().getTime()

          var thread = Components.classes[
            '@mozilla.org/thread-manager;1'
          ].getService().currentThread
          while (!reqStatus.finish) {
            if (new Date().getTime() > now + timeoutSec) break

            thread.processNextEvent(true)
          }
        }
      } catch (e) {
        GeckoJS.BaseObject.log(
          ClassName,
          'ERROR',
          'requestService req.send error ',
          e
        )
      } finally {
        if (!async) {
          if (timeout) clearTimeout(timeout)
          if (req) delete req
          if (reqStatus) delete reqStatus
        }
      }
      if (callback && !async) {
        try {
          callback.call(self, datas)
        } catch (e) {
          GeckoJS.BaseObject.log(ClassName, 'ERROR', 'callback error ', e)
        }
      }

      return datas
    }

    function getServiceUrl(settings) {
      let hostname = settings['hostname'] || 'business-manager.vivicloud.net.cn'
      let protocol = settings['protocol'] || 'https'
      let port = settings['port'] || 443
      if (hostname.indexOf(':') != -1) {
        let tmpArray = hostname.split(':')
        hostname = tmpArray[0]
        port = tmpArray[1]
      }
      let url = protocol + '://' + hostname + ':' + port + '/api'

      return url
    }

    return {
      settings: {},
      clientId: null,
      clientSecret: null,
      /**
       * Initial http settings
       *
       * @param {Object} settings
       */
      load: function (settings) {
        if (settings) {
          this.settings = settings
        }
      },

      setClient: function (clientId, clientSecret) {
        this.clientId = clientId
        this.clientSecret = clientSecret
      },

      /**
       * Send request to api server
       *
       * @param {String} request method
       * @param {String} request path, start with "/"
       * @param {Object} request data
       * @param {Boolean} asynchronous
       * @callback
       * @param {Boolean} return raw data
       * return {Object|String|null}
       */
      api: function (method, reqPath, data, async, callback, raw) {
        if (!this.settings) return null
        if (!this.clientId) return null
        if (!this.clientSecret) return null

        // NOTICE: debug mode
        if (this.settings['debug'] === 'true') {
          return PromotionMocks.getMockData(data.code)
        }

        let reqUrl = getServiceUrl(this.settings) + reqPath
        let requestData = data

        return requestApi(method, reqUrl, requestData, async, callback, raw, {
          clientId: this.clientId,
          clientSecret: this.clientSecret,
          reqPath: reqPath,
        })
      },
    }
  })()

  var GoskyMemberHttpService = (window.GoskyMemberHttpService = __class__)
})()
